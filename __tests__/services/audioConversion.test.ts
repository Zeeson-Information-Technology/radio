/**
 * Audio Conversion Service Unit Tests
 * Tests for the audio conversion service functionality
 */

import AudioConversionService from '../../lib/services/audioConversion';
import FFmpegService from '../../lib/services/ffmpeg';
import { S3Service } from '../../lib/services/s3';
import AudioRecording from '../../lib/models/AudioRecording';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock dependencies
jest.mock('../../lib/services/ffmpeg');
jest.mock('../../lib/services/s3');
jest.mock('../../lib/models/AudioRecording');
jest.mock('fs/promises');
jest.mock('path');
jest.mock('os');

const mockFFmpegService = FFmpegService as jest.MockedClass<typeof FFmpegService>;
const mockS3Service = S3Service as jest.MockedClass<typeof S3Service>;
const mockAudioRecording = AudioRecording as jest.MockedClass<typeof AudioRecording>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockOs = os as jest.Mocked<typeof os>;

describe('AudioConversionService', () => {
  let conversionService: AudioConversionService;
  let mockFFmpegInstance: any;
  let mockS3Instance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock FFmpeg service instance
    mockFFmpegInstance = {
      convertToMp3: jest.fn(),
    };

    // Mock S3 service instance
    mockS3Instance = {
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
    };

    // Setup service mocks
    mockFFmpegService.getInstance.mockReturnValue(mockFFmpegInstance);
    mockS3Service.getInstance.mockReturnValue(mockS3Instance);

    // Mock path and os utilities
    mockOs.tmpdir.mockReturnValue('/tmp');
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Mock fs operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);

    // Get fresh instance
    conversionService = AudioConversionService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AudioConversionService.getInstance();
      const instance2 = AudioConversionService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('needsConversion Static Method', () => {
    it('should identify formats that need conversion', () => {
      const needsConversionFormats = ['amr', 'amr-wb', '3gp', '3gp2', 'wma', 'mpeg'];
      
      needsConversionFormats.forEach(format => {
        expect(AudioConversionService.needsConversion(format)).toBe(true);
        expect(AudioConversionService.needsConversion(format.toUpperCase())).toBe(true);
      });
    });

    it('should identify formats that do not need conversion', () => {
      const noConversionFormats = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'];
      
      noConversionFormats.forEach(format => {
        expect(AudioConversionService.needsConversion(format)).toBe(false);
        expect(AudioConversionService.needsConversion(format.toUpperCase())).toBe(false);
      });
    });

    it('should handle unknown formats', () => {
      expect(AudioConversionService.needsConversion('unknown')).toBe(false);
      expect(AudioConversionService.needsConversion('')).toBe(false);
    });
  });

  describe('addConversionJob', () => {
    beforeEach(() => {
      // Mock AudioRecording.findByIdAndUpdate
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    });

    it('should add job to queue and update recording status', async () => {
      const recordingId = 'recording123';
      const inputUrl = 'https://s3.amazonaws.com/bucket/input.amr';

      await conversionService.addConversionJob(recordingId, inputUrl);

      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        recordingId,
        { conversionStatus: 'pending' }
      );

      const queueStatus = conversionService.getQueueStatus();
      expect(queueStatus.queueLength).toBe(1);
    });

    it('should start processing if queue was empty', async () => {
      const recordingId = 'recording123';
      const inputUrl = 'https://s3.amazonaws.com/bucket/input.amr';

      // Mock successful conversion
      mockS3Instance.downloadFile.mockResolvedValue(undefined);
      mockFFmpegInstance.convertToMp3.mockResolvedValue({
        success: true,
        outputPath: '/tmp/output.mp3',
        duration: 300,
        fileSize: 5242880,
      });
      mockS3Instance.uploadFile.mockResolvedValue('https://s3.amazonaws.com/bucket/playback.mp3');

      await conversionService.addConversionJob(recordingId, inputUrl);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockS3Instance.downloadFile).toHaveBeenCalled();
      expect(mockFFmpegInstance.convertToMp3).toHaveBeenCalled();
    });
  });

  describe('processConversionJob', () => {
    beforeEach(() => {
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    });

    it('should successfully process a conversion job', async () => {
      const job = {
        recordingId: 'recording123',
        inputUrl: 'https://s3.amazonaws.com/bucket/input.amr',
        outputKey: 'playback/2024/01/recording123.mp3',
        attempts: 0,
      };

      // Mock successful conversion
      mockS3Instance.downloadFile.mockResolvedValue(undefined);
      mockFFmpegInstance.convertToMp3.mockResolvedValue({
        success: true,
        outputPath: '/tmp/output.mp3',
        duration: 300,
        fileSize: 5242880,
      });
      mockS3Instance.uploadFile.mockResolvedValue('https://s3.amazonaws.com/bucket/playback.mp3');

      await conversionService.addConversionJob(job.recordingId, job.inputUrl);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockS3Instance.downloadFile).toHaveBeenCalledWith(
        job.inputUrl,
        expect.stringContaining('input-recording123')
      );

      expect(mockFFmpegInstance.convertToMp3).toHaveBeenCalledWith(
        expect.stringContaining('input-recording123'),
        expect.stringContaining('output-recording123')
      );

      expect(mockS3Instance.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('output-recording123'),
        job.outputKey,
        'audio/mpeg'
      );

      // Check final status update
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        job.recordingId,
        expect.objectContaining({
          conversionStatus: 'ready',
          playbackUrl: 'https://s3.amazonaws.com/bucket/playback.mp3',
          playbackFormat: 'mp3',
          duration: 300,
        })
      );
    });

    it('should handle conversion failures with retry logic', async () => {
      const job = {
        recordingId: 'recording123',
        inputUrl: 'https://s3.amazonaws.com/bucket/input.amr',
        outputKey: 'playback/2024/01/recording123.mp3',
        attempts: 0,
      };

      // Mock failed conversion
      mockS3Instance.downloadFile.mockResolvedValue(undefined);
      mockFFmpegInstance.convertToMp3.mockResolvedValue({
        success: false,
        error: 'FFmpeg conversion failed',
      });

      await conversionService.addConversionJob(job.recordingId, job.inputUrl);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update status to pending for retry
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        job.recordingId,
        { conversionStatus: 'pending' }
      );
    });

    it('should mark as failed after max retry attempts', async () => {
      const job = {
        recordingId: 'recording123',
        inputUrl: 'https://s3.amazonaws.com/bucket/input.amr',
        outputKey: 'playback/2024/01/recording123.mp3',
        attempts: 3, // Max attempts reached
      };

      // Mock failed conversion
      mockS3Instance.downloadFile.mockResolvedValue(undefined);
      mockFFmpegInstance.convertToMp3.mockResolvedValue({
        success: false,
        error: 'FFmpeg conversion failed',
      });

      // Manually test the failure handling by simulating max attempts
      const conversionService = AudioConversionService.getInstance();
      
      // Add job multiple times to simulate retries
      for (let i = 0; i < 3; i++) {
        await conversionService.addConversionJob(job.recordingId, job.inputUrl);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // After max attempts, should be marked as failed
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        job.recordingId,
        expect.objectContaining({
          conversionStatus: 'failed',
          conversionError: expect.any(String),
        })
      );
    });

    it('should clean up temporary files after processing', async () => {
      const job = {
        recordingId: 'recording123',
        inputUrl: 'https://s3.amazonaws.com/bucket/input.amr',
        outputKey: 'playback/2024/01/recording123.mp3',
        attempts: 0,
      };

      mockS3Instance.downloadFile.mockResolvedValue(undefined);
      mockFFmpegInstance.convertToMp3.mockResolvedValue({
        success: true,
        outputPath: '/tmp/output.mp3',
        duration: 300,
        fileSize: 5242880,
      });
      mockS3Instance.uploadFile.mockResolvedValue('https://s3.amazonaws.com/bucket/playback.mp3');

      await conversionService.addConversionJob(job.recordingId, job.inputUrl);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should clean up both input and output files
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should handle S3 download failures', async () => {
      const job = {
        recordingId: 'recording123',
        inputUrl: 'https://s3.amazonaws.com/bucket/input.amr',
        outputKey: 'playback/2024/01/recording123.mp3',
        attempts: 0,
      };

      mockS3Instance.downloadFile.mockRejectedValue(new Error('S3 download failed'));

      await conversionService.addConversionJob(job.recordingId, job.inputUrl);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update status to pending for retry
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        job.recordingId,
        { conversionStatus: 'pending' }
      );
    });

    it('should handle S3 upload failures', async () => {
      const job = {
        recordingId: 'recording123',
        inputUrl: 'https://s3.amazonaws.com/bucket/input.amr',
        outputKey: 'playback/2024/01/recording123.mp3',
        attempts: 0,
      };

      mockS3Instance.downloadFile.mockResolvedValue(undefined);
      mockFFmpegInstance.convertToMp3.mockResolvedValue({
        success: true,
        outputPath: '/tmp/output.mp3',
        duration: 300,
        fileSize: 5242880,
      });
      mockS3Instance.uploadFile.mockRejectedValue(new Error('S3 upload failed'));

      await conversionService.addConversionJob(job.recordingId, job.inputUrl);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update status to pending for retry
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        job.recordingId,
        { conversionStatus: 'pending' }
      );
    });
  });

  describe('generatePlaybackKey', () => {
    it('should generate correct S3 key format', () => {
      const recordingId = 'recording123';
      const service = AudioConversionService.getInstance();
      
      // Access private method through any cast for testing
      const key = (service as any).generatePlaybackKey(recordingId);
      
      expect(key).toMatch(/^playback\/\d{4}\/\d{2}\/recording123\.mp3$/);
    });

    it('should include current year and month', () => {
      const recordingId = 'recording123';
      const service = AudioConversionService.getInstance();
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const key = (service as any).generatePlaybackKey(recordingId);
      
      expect(key).toBe(`playback/${year}/${month}/recording123.mp3`);
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status', () => {
      const service = AudioConversionService.getInstance();
      const initialStatus = service.getQueueStatus();
      
      expect(initialStatus).toEqual({
        queueLength: 0,
        isProcessing: false,
      });
    });

    it('should update queue length when jobs are added', async () => {
      const service = AudioConversionService.getInstance();
      
      // Mock to prevent actual processing
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      mockS3Instance.downloadFile.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      await service.addConversionJob('recording1', 'url1');
      await service.addConversionJob('recording2', 'url2');
      
      const status = service.getQueueStatus();
      expect(status.queueLength).toBe(2);
    });
  });

  describe('updateRecordingStatus', () => {
    it('should update recording status correctly', async () => {
      const service = AudioConversionService.getInstance();
      const recordingId = 'recording123';
      
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      
      // Test private method through any cast
      await (service as any).updateRecordingStatus(recordingId, 'processing');
      
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        recordingId,
        {
          conversionStatus: 'processing',
          $inc: { conversionAttempts: 1 }
        }
      );
    });

    it('should not increment attempts for non-processing status', async () => {
      const service = AudioConversionService.getInstance();
      const recordingId = 'recording123';
      
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      
      await (service as any).updateRecordingStatus(recordingId, 'ready');
      
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        recordingId,
        {
          conversionStatus: 'ready',
          $inc: { conversionAttempts: 0 }
        }
      );
    });

    it('should handle database update failures gracefully', async () => {
      const service = AudioConversionService.getInstance();
      const recordingId = 'recording123';
      
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockRejectedValue(
        new Error('Database update failed')
      );
      
      // Should not throw error
      await expect(
        (service as any).updateRecordingStatus(recordingId, 'processing')
      ).resolves.toBeUndefined();
    });
  });

  describe('updateRecordingConversion', () => {
    it('should update recording with successful conversion results', async () => {
      const service = AudioConversionService.getInstance();
      const recordingId = 'recording123';
      const updates = {
        playbackUrl: 'https://s3.amazonaws.com/bucket/playback.mp3',
        conversionStatus: 'ready' as const,
        duration: 300,
        fileSize: 5242880,
        conversionCompletedAt: new Date(),
      };
      
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      
      await (service as any).updateRecordingConversion(recordingId, updates);
      
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        recordingId,
        expect.objectContaining({
          conversionStatus: 'ready',
          playbackUrl: updates.playbackUrl,
          playbackFormat: 'mp3',
          duration: 300,
          conversionCompletedAt: updates.conversionCompletedAt,
        })
      );
    });

    it('should update recording with failed conversion results', async () => {
      const service = AudioConversionService.getInstance();
      const recordingId = 'recording123';
      const updates = {
        conversionStatus: 'failed' as const,
        conversionError: 'FFmpeg conversion failed',
        conversionCompletedAt: new Date(),
      };
      
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      
      await (service as any).updateRecordingConversion(recordingId, updates);
      
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalledWith(
        recordingId,
        expect.objectContaining({
          conversionStatus: 'failed',
          conversionError: 'FFmpeg conversion failed',
          conversionCompletedAt: updates.conversionCompletedAt,
        })
      );
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up all provided file paths', async () => {
      const service = AudioConversionService.getInstance();
      const filePaths = ['/tmp/input.amr', '/tmp/output.mp3'];
      
      mockFs.unlink.mockResolvedValue(undefined);
      
      await (service as any).cleanupTempFiles(filePaths);
      
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
      expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/input.amr');
      expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/output.mp3');
    });

    it('should ignore cleanup errors', async () => {
      const service = AudioConversionService.getInstance();
      const filePaths = ['/tmp/input.amr', '/tmp/output.mp3'];
      
      mockFs.unlink.mockRejectedValue(new Error('File not found'));
      
      // Should not throw error
      await expect(
        (service as any).cleanupTempFiles(filePaths)
      ).resolves.toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      (mockAudioRecording.findByIdAndUpdate as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const service = AudioConversionService.getInstance();
      
      // Should not throw error
      await expect(
        service.addConversionJob('recording123', 'https://example.com/input.amr')
      ).resolves.toBeUndefined();
    });

    it('should handle file system errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      
      const service = AudioConversionService.getInstance();
      
      await service.addConversionJob('recording123', 'https://example.com/input.amr');
      
      // Wait for processing attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should handle the error and continue
      expect(mockAudioRecording.findByIdAndUpdate).toHaveBeenCalled();
    });
  });
});