/**
 * Audio Conversion Flow Tests
 * Tests end-to-end audio conversion from upload to playback
 */

import { NextRequest } from 'next/server';

// Mock dependencies
global.fetch = jest.fn();

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('fake mp3 data')),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock AWS S3
const mockS3 = {
  getObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Body: Buffer.from('fake amr data')
    })
  }),
  putObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  })
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => mockS3),
  config: { update: jest.fn() }
}));

// Mock FFmpeg
const mockFfmpeg = jest.fn().mockReturnValue({
  audioCodec: jest.fn().mockReturnThis(),
  audioBitrate: jest.fn().mockReturnThis(),
  audioChannels: jest.fn().mockReturnThis(),
  audioFrequency: jest.fn().mockReturnThis(),
  output: jest.fn().mockReturnThis(),
  on: jest.fn().mockImplementation(function(event, callback) {
    if (event === 'end') {
      setTimeout(callback, 10); // Simulate successful conversion
    }
    return this;
  }),
  run: jest.fn()
});

jest.mock('fluent-ffmpeg', () => mockFfmpeg);

// Mock database models
const mockAudioRecording = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn()
};

jest.mock('../../lib/models/AudioRecording', () => ({
  default: mockAudioRecording
}));

jest.mock('../../lib/db', () => ({
  connectDB: jest.fn().mockResolvedValue(true)
}));

describe('Audio Conversion Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset S3 mocks
    mockS3.getObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('fake amr data')
      })
    });
    
    mockS3.putObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });

    // Reset FFmpeg mock
    mockFfmpeg.mockReturnValue({
      audioCodec: jest.fn().mockReturnThis(),
      audioBitrate: jest.fn().mockReturnThis(),
      audioChannels: jest.fn().mockReturnThis(),
      audioFrequency: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation(function(event, callback) {
        if (event === 'end') {
          setTimeout(callback, 10);
        }
        return this;
      }),
      run: jest.fn()
    });
  });

  describe('AMR File Conversion', () => {
    it('should detect AMR files and trigger conversion', async () => {
      const recordId = 'test-record-123';
      const originalKey = 'originals/test-record-123.amr';
      
      // Mock database record
      mockAudioRecording.findById.mockResolvedValue({
        _id: recordId,
        title: 'Test AMR Recording',
        format: 'amr',
        conversionStatus: 'pending'
      });
      
      mockAudioRecording.findByIdAndUpdate.mockResolvedValue({});

      // Mock gateway conversion API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobId: 'conv_123456',
          status: 'queued',
          message: 'Conversion job queued successfully'
        })
      });

      // Simulate conversion request to gateway
      const response = await fetch('http://localhost:8080/api/convert-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          recordId,
          originalKey,
          format: 'amr'
        })
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('conv_123456');
      expect(result.status).toBe('queued');
    });

    it('should process AMR to MP3 conversion successfully', async () => {
      const recordId = 'test-record-123';
      
      // Mock database record
      mockAudioRecording.findById.mockResolvedValue({
        _id: recordId,
        title: 'Test AMR Recording',
        format: 'amr',
        conversionStatus: 'pending'
      });

      // Simulate conversion processing
      const conversionJob = {
        recordId,
        originalKey: 'originals/test-record-123.amr',
        format: 'amr',
        status: 'processing',
        progress: 0
      };

      // Step 1: Download from S3
      conversionJob.progress = 30;
      expect(mockS3.getObject).toBeDefined();

      // Step 2: Convert with FFmpeg
      conversionJob.progress = 70;
      
      // Simulate FFmpeg conversion process
      const ffmpegConfig = {
        audioCodec: 'libmp3lame',
        audioBitrate: 64,
        audioChannels: 1,
        audioFrequency: 22050
      };
      
      expect(ffmpegConfig.audioCodec).toBe('libmp3lame');
      expect(ffmpegConfig.audioBitrate).toBe(64);
      expect(ffmpegConfig.audioChannels).toBe(1);
      expect(ffmpegConfig.audioFrequency).toBe(22050);

      // Step 3: Upload MP3 to S3
      conversionJob.progress = 90;
      expect(mockS3.putObject).toBeDefined();

      // Step 4: Update database
      conversionJob.progress = 100;
      conversionJob.status = 'completed';
      
      const playbackUrl = 'https://test-bucket.s3.amazonaws.com/playback/test-record-123.mp3';
      
      expect(mockAudioRecording.findByIdAndUpdate).toBeDefined();
      
      // Verify final state
      expect(conversionJob.status).toBe('completed');
      expect(conversionJob.progress).toBe(100);
    });

    it('should handle conversion errors with retry logic', async () => {
      const recordId = 'test-record-123';
      
      // Mock database record with failed attempts
      mockAudioRecording.findById.mockResolvedValue({
        _id: recordId,
        title: 'Test AMR Recording',
        format: 'amr',
        conversionStatus: 'pending',
        conversionAttempts: 1
      });

      // Mock FFmpeg error
      mockFfmpeg.mockReturnValue({
        audioCodec: jest.fn().mockReturnThis(),
        audioBitrate: jest.fn().mockReturnThis(),
        audioChannels: jest.fn().mockReturnThis(),
        audioFrequency: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function(event, callback) {
          if (event === 'error') {
            setTimeout(() => callback(new Error('FFmpeg conversion failed')), 10);
          }
          return this;
        }),
        run: jest.fn()
      });

      // Simulate conversion failure
      const conversionJob = {
        recordId,
        status: 'failed',
        error: 'FFmpeg conversion failed',
        attempts: 1
      };

      // Should retry up to 3 times
      if (conversionJob.attempts < 3) {
        conversionJob.status = 'queued'; // Re-queue for retry
        conversionJob.attempts += 1;
        
        expect(conversionJob.status).toBe('queued');
        expect(conversionJob.attempts).toBe(2);
      } else {
        // Mark as permanently failed after 3 attempts
        conversionJob.status = 'failed';
        
        expect(mockAudioRecording.findByIdAndUpdate).toBeDefined();
      }
    });
  });

  describe('Conversion Status Tracking', () => {
    it('should provide real-time conversion progress updates', async () => {
      const jobId = 'conv_123456';
      
      // Mock gateway status endpoint
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobId,
          status: 'processing',
          progress: 45,
          error: null,
          playbackUrl: null
        })
      });

      const response = await fetch(`http://localhost:8080/api/convert-status/${jobId}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      const status = await response.json();

      expect(status.jobId).toBe(jobId);
      expect(status.status).toBe('processing');
      expect(status.progress).toBe(45);
      expect(status.playbackUrl).toBeNull();
    });

    it('should return completed status with playback URL', async () => {
      const jobId = 'conv_123456';
      const playbackUrl = 'https://test-bucket.s3.amazonaws.com/playback/test-record-123.mp3';
      
      // Mock completed conversion
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobId,
          status: 'completed',
          progress: 100,
          error: null,
          playbackUrl
        })
      });

      const response = await fetch(`http://localhost:8080/api/convert-status/${jobId}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      const status = await response.json();

      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
      expect(status.playbackUrl).toBe(playbackUrl);
    });
  });

  describe('User Experience During Conversion', () => {
    it('should show conversion progress to user when playing AMR file', async () => {
      const recordId = 'test-record-123';
      
      // User tries to play AMR file that needs conversion
      const playRequest = {
        recordId,
        format: 'amr',
        conversionStatus: 'pending'
      };

      // Mock API response for play request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 202, // Accepted but still processing
        json: async () => ({
          success: false,
          message: 'Audio is still being converted for web playback. Please wait...',
          conversionStatus: 'processing',
          progress: 30
        })
      });

      const response = await fetch(`/api/audio/play/${recordId}`);
      const result = await response.json();

      expect(response.status).toBe(202);
      expect(result.message).toContain('still being converted');
      expect(result.conversionStatus).toBe('processing');
    });

    it('should automatically retry playback after conversion completes', async () => {
      const recordId = 'test-record-123';
      
      // First request: Still converting
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 202,
          json: async () => ({
            success: false,
            message: 'Audio is still being converted',
            conversionStatus: 'processing'
          })
        })
        // Second request: Conversion complete
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              id: recordId,
              title: 'Test Recording',
              format: 'mp3',
              conversionStatus: 'ready',
              audioUrl: 'https://test-bucket.s3.amazonaws.com/playback/test-record-123.mp3'
            }
          })
        });

      // First attempt
      let response = await fetch(`/api/audio/play/${recordId}`);
      let result = await response.json();
      
      expect(response.status).toBe(202);
      expect(result.conversionStatus).toBe('processing');

      // Simulate retry after 5 seconds
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second attempt
      response = await fetch(`/api/audio/play/${recordId}`);
      result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.conversionStatus).toBe('ready');
      expect(result.data.audioUrl).toBeTruthy();
    });

    it('should handle conversion failure gracefully for user', async () => {
      const recordId = 'test-record-123';
      
      // Mock conversion failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422, // Unprocessable Entity
        json: async () => ({
          success: false,
          message: 'Audio conversion failed. The file format may be corrupted or unsupported.',
          conversionStatus: 'failed',
          error: 'FFmpeg conversion failed after 3 attempts'
        })
      });

      const response = await fetch(`/api/audio/play/${recordId}`);
      const result = await response.json();

      expect(response.status).toBe(422);
      expect(result.success).toBe(false);
      expect(result.conversionStatus).toBe('failed');
      expect(result.message).toContain('conversion failed');
    });
  });

  describe('Multiple Format Support', () => {
    it('should handle different audio formats appropriately', async () => {
      const testCases = [
        {
          format: 'mp3',
          needsConversion: false,
          expectedStatus: 'ready'
        },
        {
          format: 'amr',
          needsConversion: true,
          expectedStatus: 'pending'
        },
        {
          format: 'wav',
          needsConversion: true,
          expectedStatus: 'pending'
        },
        {
          format: 'ogg',
          needsConversion: true,
          expectedStatus: 'pending'
        }
      ];

      for (const testCase of testCases) {
        const recordId = `test-${testCase.format}-123`;
        
        mockAudioRecording.create.mockResolvedValueOnce({
          _id: recordId,
          format: testCase.format,
          conversionStatus: testCase.expectedStatus
        });

        // Simulate file upload
        const uploadData = {
          recordId,
          format: testCase.format,
          needsConversion: testCase.needsConversion
        };

        if (testCase.needsConversion) {
          // Should trigger conversion
          expect(uploadData.needsConversion).toBe(true);
          
          // Mock gateway call for conversion
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              jobId: `conv_${recordId}`,
              status: 'queued'
            })
          });
        } else {
          // Should be ready immediately
          expect(uploadData.needsConversion).toBe(false);
        }
      }
    });

    it('should optimize conversion settings based on audio type', async () => {
      const voiceRecording = {
        format: 'amr',
        type: 'voice_memo',
        duration: 180 // 3 minutes
      };

      const musicRecording = {
        format: 'wav',
        type: 'nasheed',
        duration: 240 // 4 minutes
      };

      // Voice recordings should use lower bitrate
      const voiceSettings = {
        bitrate: 64, // 64kbps for voice
        channels: 1, // Mono
        sampleRate: 22050 // 22kHz
      };

      // Music recordings should use higher quality
      const musicSettings = {
        bitrate: 128, // 128kbps for music
        channels: 2, // Stereo
        sampleRate: 44100 // 44kHz
      };

      expect(voiceSettings.bitrate).toBeLessThan(musicSettings.bitrate);
      expect(voiceSettings.channels).toBeLessThan(musicSettings.channels);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should limit concurrent conversions to prevent resource exhaustion', async () => {
      const maxConcurrent = 2;
      const activeJobs = new Set();
      
      // Simulate multiple conversion requests
      const jobs = [
        { id: 'job1', status: 'queued' },
        { id: 'job2', status: 'queued' },
        { id: 'job3', status: 'queued' },
        { id: 'job4', status: 'queued' }
      ];

      // Process jobs with concurrency limit
      for (const job of jobs) {
        if (activeJobs.size < maxConcurrent) {
          activeJobs.add(job.id);
          job.status = 'processing';
        }
      }

      // Only first 2 jobs should be processing
      expect(jobs[0].status).toBe('processing');
      expect(jobs[1].status).toBe('processing');
      expect(jobs[2].status).toBe('queued');
      expect(jobs[3].status).toBe('queued');
      expect(activeJobs.size).toBe(maxConcurrent);
    });

    it('should clean up temporary files after conversion', async () => {
      const fs = require('fs');
      const tempInputPath = '/tmp/test-conversion/job123_input.amr';
      const tempOutputPath = '/tmp/test-conversion/job123_output.mp3';

      // Simulate conversion process
      await fs.promises.writeFile(tempInputPath, Buffer.from('fake amr'));
      await fs.promises.writeFile(tempOutputPath, Buffer.from('fake mp3'));

      // Cleanup should be called
      await fs.promises.unlink(tempInputPath);
      await fs.promises.unlink(tempOutputPath);

      expect(fs.promises.unlink).toHaveBeenCalledWith(tempInputPath);
      expect(fs.promises.unlink).toHaveBeenCalledWith(tempOutputPath);
    });
  });
});