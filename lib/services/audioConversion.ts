import FFmpegService from './ffmpeg';
import { S3Service } from './s3';
import AudioRecording from '../models/AudioRecording';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface ConversionJob {
  recordingId: string;
  inputUrl: string;
  outputKey: string;
  attempts: number;
}

export class AudioConversionService {
  private static instance: AudioConversionService;
  private ffmpeg: FFmpegService;
  private s3: S3Service;
  private processingQueue: ConversionJob[] = [];
  private isProcessing = false;

  constructor() {
    this.ffmpeg = FFmpegService.getInstance();
    this.s3 = S3Service.getInstance();
  }

  static getInstance(): AudioConversionService {
    if (!AudioConversionService.instance) {
      AudioConversionService.instance = new AudioConversionService();
    }
    return AudioConversionService.instance;
  }

  /**
   * Add a conversion job to the queue
   */
  async addConversionJob(recordingId: string, inputUrl: string): Promise<void> {
    console.log('🎵 Conversion: Adding job for recording', recordingId);

    // Generate output key for converted MP3
    const outputKey = this.generatePlaybackKey(recordingId);

    const job: ConversionJob = {
      recordingId,
      inputUrl,
      outputKey,
      attempts: 0
    };

    this.processingQueue.push(job);
    
    // Update recording status to pending
    await this.updateRecordingStatus(recordingId, 'pending');

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the conversion queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('🎵 Conversion: Starting queue processing');

    while (this.processingQueue.length > 0) {
      const job = this.processingQueue.shift();
      if (job) {
        await this.processConversionJob(job);
      }
    }

    this.isProcessing = false;
    console.log('🎵 Conversion: Queue processing completed');
  }

  /**
   * Process a single conversion job
   */
  private async processConversionJob(job: ConversionJob): Promise<void> {
    const { recordingId, inputUrl, outputKey } = job;
    
    try {
      console.log('🎵 Conversion: Processing job', { recordingId, inputUrl, outputKey });

      // Update status to processing
      await this.updateRecordingStatus(recordingId, 'processing');

      // Download original file from S3
      const tempDir = path.join(os.tmpdir(), 'audio-conversion');
      await fs.mkdir(tempDir, { recursive: true });
      
      const inputPath = path.join(tempDir, `input-${recordingId}-${Date.now()}`);
      const outputPath = path.join(tempDir, `output-${recordingId}-${Date.now()}.mp3`);

      console.log('🎵 Conversion: Downloading original file');
      await this.s3.downloadFile(inputUrl, inputPath);

      // Convert using FFmpeg
      console.log('🎵 Conversion: Converting to MP3');
      const conversionResult = await this.ffmpeg.convertToMp3(inputPath, outputPath);

      if (conversionResult.success && conversionResult.outputPath) {
        // Upload converted file to S3
        console.log('🎵 Conversion: Uploading converted file');
        const playbackUrl = await this.s3.uploadFile(outputPath, outputKey, 'audio/mpeg');

        // Update recording with conversion results
        await this.updateRecordingConversion(recordingId, {
          playbackUrl,
          conversionStatus: 'ready',
          duration: conversionResult.duration,
          fileSize: conversionResult.fileSize,
          conversionCompletedAt: new Date()
        });

        console.log('🎵 Conversion: Job completed successfully', recordingId);

      } else {
        // Handle conversion failure
        await this.handleConversionFailure(job, conversionResult.error || 'Unknown conversion error');
      }

      // Clean up temporary files
      await this.cleanupTempFiles([inputPath, outputPath]);

    } catch (error) {
      console.error('🎵 Conversion: Job failed', recordingId, error);
      await this.handleConversionFailure(job, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle conversion failure with retry logic
   */
  private async handleConversionFailure(job: ConversionJob, error: string): Promise<void> {
    const { recordingId } = job;
    job.attempts++;

    console.log('🎵 Conversion: Job failed', { recordingId, attempts: job.attempts, error });

    if (job.attempts < 3) {
      // Retry with exponential backoff
      const delay = Math.pow(2, job.attempts) * 60000; // 2min, 4min, 8min
      console.log(`🎵 Conversion: Retrying in ${delay / 1000} seconds`);
      
      setTimeout(() => {
        this.processingQueue.unshift(job); // Add to front of queue for retry
        if (!this.isProcessing) {
          this.processQueue();
        }
      }, delay);

      await this.updateRecordingStatus(recordingId, 'pending');
    } else {
      // Max attempts reached, mark as failed
      await this.updateRecordingConversion(recordingId, {
        conversionStatus: 'failed',
        conversionError: error,
        conversionCompletedAt: new Date()
      });
    }
  }

  /**
   * Update recording conversion status
   */
  private async updateRecordingStatus(recordingId: string, status: 'pending' | 'processing' | 'ready' | 'failed'): Promise<void> {
    try {
      await AudioRecording.findByIdAndUpdate(recordingId, {
        conversionStatus: status,
        $inc: { conversionAttempts: status === 'processing' ? 1 : 0 }
      });
    } catch (error) {
      console.error('🎵 Conversion: Failed to update recording status', recordingId, error);
    }
  }

  /**
   * Update recording with conversion results
   */
  private async updateRecordingConversion(recordingId: string, updates: {
    playbackUrl?: string;
    conversionStatus: 'ready' | 'failed';
    conversionError?: string;
    duration?: number;
    fileSize?: number;
    conversionCompletedAt: Date;
  }): Promise<void> {
    try {
      const updateData: any = {
        conversionStatus: updates.conversionStatus,
        conversionCompletedAt: updates.conversionCompletedAt
      };

      if (updates.playbackUrl) {
        updateData.playbackUrl = updates.playbackUrl;
        updateData.playbackFormat = 'mp3';
      }

      if (updates.conversionError) {
        updateData.conversionError = updates.conversionError;
      }

      if (updates.duration) {
        updateData.duration = Math.round(updates.duration);
      }

      await AudioRecording.findByIdAndUpdate(recordingId, updateData);
      console.log('🎵 Conversion: Updated recording', recordingId, updateData);
    } catch (error) {
      console.error('🎵 Conversion: Failed to update recording', recordingId, error);
    }
  }

  /**
   * Generate S3 key for playback file
   */
  private generatePlaybackKey(recordingId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `playback/${year}/${month}/${recordingId}.mp3`;
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Check if a format needs conversion
   */
  static needsConversion(format: string): boolean {
    const needsConversionFormats = ['amr', 'amr-wb', '3gp', '3gp2', 'wma', 'mpeg'];
    return needsConversionFormats.includes(format.toLowerCase());
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

export default AudioConversionService;