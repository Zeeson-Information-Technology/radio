/**
 * Audio Conversion Service for AMR to MP3 conversion
 */

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Configure AWS
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    region: config.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
}

const s3 = new AWS.S3();

class AudioConversionService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.queue = [];
    this.processing = new Set();
    this.jobs = new Map();
    this.maxConcurrent = config.CONVERSION_MAX_CONCURRENT;
    
    this.ensureTempDirectory();
    this.processQueue();
  }

  async ensureTempDirectory() {
    try {
      await fs.promises.mkdir(config.CONVERSION_TEMP_DIR, { recursive: true });
      console.log(`📁 Temp directory ready: ${config.CONVERSION_TEMP_DIR}`);
    } catch (error) {
      console.error('❌ Failed to create temp directory:', error);
    }
  }

  async queueConversion(recordId, originalKey, format) {
    // Check if already converted (idempotency)
    const recording = await this.databaseService.AudioRecording.findById(recordId);
    if (!recording) {
      throw new Error('Recording not found');
    }

    if (recording.conversionStatus === 'ready') {
      return {
        jobId: `existing_${recordId}`,
        status: 'completed',
        playbackUrl: recording.playbackUrl
      };
    }

    if (recording.conversionStatus === 'processing') {
      // Find existing job
      for (const [jobId, job] of this.jobs.entries()) {
        if (job.recordId === recordId) {
          return { jobId, status: 'processing' };
        }
      }
    }

    // Create new conversion job
    const jobId = uuidv4();
    const job = {
      jobId,
      recordId,
      originalKey,
      format,
      status: 'queued',
      createdAt: new Date(),
      progress: 0
    };

    this.jobs.set(jobId, job);
    this.queue.push(job);

    // Update database status
    await this.databaseService.AudioRecording.findByIdAndUpdate(recordId, {
      conversionStatus: 'pending',
      lastConversionAttempt: new Date()
    });

    console.log(`🎵 Queued conversion job ${jobId} for record ${recordId}`);
    return { jobId, status: 'queued' };
  }

  async processQueue() {
    setInterval(async () => {
      if (this.queue.length === 0 || this.processing.size >= this.maxConcurrent) {
        return;
      }

      const job = this.queue.shift();
      if (!job) return;

      this.processing.add(job.jobId);
      job.status = 'processing';

      try {
        await this.processConversion(job);
      } catch (error) {
        console.error(`❌ Conversion job ${job.jobId} failed:`, error);
        await this.handleConversionError(job, error);
      } finally {
        this.processing.delete(job.jobId);
      }
    }, 1000);
  }

  async processConversion(job) {
    console.log(`🔄 Processing conversion job ${job.jobId}`);
    
    const { recordId, originalKey } = job;
    const recording = await this.databaseService.AudioRecording.findById(recordId);
    
    if (!recording) {
      throw new Error('Recording not found');
    }

    // Update database to processing
    await this.databaseService.AudioRecording.findByIdAndUpdate(recordId, {
      conversionStatus: 'processing'
    });

    // Generate file paths
    const tempInputPath = path.join(config.CONVERSION_TEMP_DIR, `${job.jobId}_input.amr`);
    const tempOutputPath = path.join(config.CONVERSION_TEMP_DIR, `${job.jobId}_output.mp3`);
    const playbackKey = `playback/${recordId}.mp3`;

    try {
      // Download AMR file from S3
      job.progress = 10;
      console.log(`📥 Downloading ${originalKey} from S3...`);
      
      const s3Object = await s3.getObject({
        Bucket: config.AWS_S3_BUCKET,
        Key: originalKey
      }).promise();

      await fs.promises.writeFile(tempInputPath, s3Object.Body);
      job.progress = 30;

      // Convert AMR to MP3 using FFmpeg
      console.log(`🎵 Converting AMR to MP3...`);
      await this.convertAudioFile(tempInputPath, tempOutputPath);
      job.progress = 70;

      // Upload MP3 to S3
      console.log(`📤 Uploading MP3 to S3...`);
      const mp3Data = await fs.promises.readFile(tempOutputPath);
      
      await s3.putObject({
        Bucket: config.AWS_S3_BUCKET,
        Key: playbackKey,
        Body: mp3Data,
        ContentType: 'audio/mpeg'
      }).promise();

      const playbackUrl = `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${playbackKey}`;
      job.progress = 90;

      // Update database record
      await this.databaseService.AudioRecording.findByIdAndUpdate(recordId, {
        conversionStatus: 'ready',
        playbackKey,
        playbackUrl,
        conversionError: null
      });

      job.status = 'completed';
      job.progress = 100;
      job.playbackUrl = playbackUrl;

      console.log(`✅ Conversion job ${job.jobId} completed successfully`);

    } finally {
      // Clean up temp files
      try {
        await fs.promises.unlink(tempInputPath).catch(() => {});
        await fs.promises.unlink(tempOutputPath).catch(() => {});
      } catch (error) {
        console.warn('⚠️ Failed to clean up temp files:', error);
      }
    }
  }

  async convertAudioFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate(64) // 64kbps for voice recordings
        .audioChannels(1) // Mono
        .audioFrequency(22050) // 22kHz sample rate
        .output(outputPath)
        .on('end', () => {
          console.log('🎵 FFmpeg conversion completed');
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ FFmpeg conversion failed:', error);
          reject(error);
        })
        .run();
    });
  }

  async handleConversionError(job, error) {
    const { recordId } = job;
    
    // Increment retry count
    const recording = await this.databaseService.AudioRecording.findById(recordId);
    const attempts = (recording.conversionAttempts || 0) + 1;
    
    if (attempts < 3) {
      // Retry
      console.log(`🔄 Retrying conversion job ${job.jobId} (attempt ${attempts + 1})`);
      
      await this.databaseService.AudioRecording.findByIdAndUpdate(recordId, {
        conversionStatus: 'pending',
        conversionAttempts: attempts,
        lastConversionAttempt: new Date()
      });

      // Re-queue with delay
      setTimeout(() => {
        job.status = 'queued';
        this.queue.push(job);
      }, Math.pow(2, attempts) * 1000); // Exponential backoff
      
    } else {
      // Mark as failed
      console.log(`❌ Conversion job ${job.jobId} failed permanently after ${attempts} attempts`);
      
      await this.databaseService.AudioRecording.findByIdAndUpdate(recordId, {
        conversionStatus: 'failed',
        conversionError: error.message,
        conversionAttempts: attempts,
        lastConversionAttempt: new Date()
      });

      job.status = 'failed';
      job.error = error.message;
    }
  }

  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress || 0,
      error: job.error || null,
      playbackUrl: job.playbackUrl || null
    };
  }
}

module.exports = AudioConversionService;