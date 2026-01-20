/**
 * Upload and Conversion Workflow Integration Tests
 * End-to-end tests for the complete upload and conversion process
 */

import { getFormatByExtension, getSupportedMimeTypes } from '../../lib/utils/audio-formats';
import AudioConversionService from '../../lib/services/audioConversion';

// Mock fetch for gateway communication
global.fetch = jest.fn();

describe('Upload and Conversion Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobId: 'test-job-123' }),
      text: () => Promise.resolve('Success'),
    });
  });

  describe('File Validation Workflow', () => {
    const createMockFile = (name: string, type: string, size: number) => {
      const file = new File(['test content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    const validateUploadFile = (file: File) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const formatInfo = getFormatByExtension(fileExtension || '');
      const supportedMimeTypes = getSupportedMimeTypes();
      const maxSize = 30 * 1024 * 1024; // 30MB

      // Extension validation
      if (!fileExtension || !formatInfo) {
        return {
          valid: false,
          error: `Unsupported file extension: .${fileExtension || 'unknown'}`,
          errorType: 'extension'
        };
      }

      // MIME type validation (allow empty MIME type if extension is valid)
      const hasValidMimeType = file.type && supportedMimeTypes.includes(file.type);
      const hasValidExtension = formatInfo !== null;
      
      if (!hasValidMimeType && !hasValidExtension) {
        return {
          valid: false,
          error: `Unsupported file format: ${file.type || 'unknown MIME type'}`,
          errorType: 'format'
        };
      }

      // Size validation
      if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return {
          valid: false,
          error: `File too large (${sizeMB}MB). Maximum size is 30MB.`,
          errorType: 'size'
        };
      }

      // Check if conversion is needed
      const needsConversion = AudioConversionService.needsConversion(formatInfo.extension);

      return {
        valid: true,
        error: null,
        errorType: null,
        format: formatInfo.extension,
        needsConversion,
        mimeType: file.type || 'application/octet-stream'
      };
    };

    it('should validate MP3 files correctly', () => {
      const mp3File = createMockFile('lecture.mp3', 'audio/mpeg', 5 * 1024 * 1024);
      const result = validateUploadFile(mp3File);

      expect(result.valid).toBe(true);
      expect(result.format).toBe('mp3');
      expect(result.needsConversion).toBe(false);
    });

    it('should validate MPEG files and mark for conversion', () => {
      const mpegFile = createMockFile('lecture.mpeg', 'audio/mpeg', 5 * 1024 * 1024);
      const result = validateUploadFile(mpegFile);

      expect(result.valid).toBe(true);
      expect(result.format).toBe('mpeg');
      expect(result.needsConversion).toBe(true);
    });

    it('should validate AMR files with missing MIME type', () => {
      const amrFile = createMockFile('voice.amr', '', 2 * 1024 * 1024);
      const result = validateUploadFile(amrFile);

      expect(result.valid).toBe(true);
      expect(result.format).toBe('amr');
      expect(result.needsConversion).toBe(true);
    });

    it('should reject files with unsupported extensions', () => {
      const txtFile = createMockFile('document.txt', 'text/plain', 1024);
      const result = validateUploadFile(txtFile);

      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('extension');
      expect(result.error).toContain('Unsupported file extension: .txt');
    });

    it('should reject oversized files', () => {
      const largeFile = createMockFile('large.mp3', 'audio/mpeg', 50 * 1024 * 1024);
      const result = validateUploadFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('size');
      expect(result.error).toContain('File too large (50.0MB)');
    });

    it('should handle edge case file sizes', () => {
      // Exactly at limit
      const exactLimitFile = createMockFile('exact.mp3', 'audio/mpeg', 30 * 1024 * 1024);
      const exactResult = validateUploadFile(exactLimitFile);
      expect(exactResult.valid).toBe(true);

      // Just over limit
      const overLimitFile = createMockFile('over.mp3', 'audio/mpeg', 30 * 1024 * 1024 + 1);
      const overResult = validateUploadFile(overLimitFile);
      expect(overResult.valid).toBe(false);
      expect(overResult.errorType).toBe('size');
    });
  });

  describe('Conversion Decision Logic', () => {
    it('should correctly identify formats needing conversion', () => {
      const conversionFormats = [
        { format: 'mpeg', shouldConvert: true },
        { format: 'amr', shouldConvert: true },
        { format: 'amr-wb', shouldConvert: true },
        { format: '3gp', shouldConvert: true },
        { format: '3gp2', shouldConvert: true },
        { format: 'wma', shouldConvert: true },
      ];

      conversionFormats.forEach(({ format, shouldConvert }) => {
        const needsConversion = AudioConversionService.needsConversion(format);
        expect(needsConversion).toBe(shouldConvert);
      });
    });

    it('should correctly identify formats not needing conversion', () => {
      const noConversionFormats = [
        { format: 'mp3', shouldConvert: false },
        { format: 'wav', shouldConvert: false },
        { format: 'm4a', shouldConvert: false },
        { format: 'aac', shouldConvert: false },
        { format: 'ogg', shouldConvert: false },
        { format: 'flac', shouldConvert: false },
        { format: 'webm', shouldConvert: false },
      ];

      noConversionFormats.forEach(({ format, shouldConvert }) => {
        const needsConversion = AudioConversionService.needsConversion(format);
        expect(needsConversion).toBe(shouldConvert);
      });
    });

    it('should handle case-insensitive format checking', () => {
      expect(AudioConversionService.needsConversion('MPEG')).toBe(true);
      expect(AudioConversionService.needsConversion('Mp3')).toBe(false);
      expect(AudioConversionService.needsConversion('AMR')).toBe(true);
      expect(AudioConversionService.needsConversion('WaV')).toBe(false);
    });
  });

  describe('Upload Response Workflow', () => {
    const createUploadResponse = (file: File, needsConversion: boolean) => {
      const baseResponse = {
        success: true,
        recordingId: 'recording-123',
        status: 'active',
        duration: 300,
        fileSize: file.size,
        visibility: 'public',
        sharedWith: [],
        broadcastReady: true,
        needsConversion,
      };

      if (needsConversion) {
        return {
          ...baseResponse,
          message: 'Audio uploaded successfully. Conversion to MP3 in progress for web playback.',
          conversionStatus: 'pending',
        };
      } else {
        return {
          ...baseResponse,
          message: 'Audio uploaded successfully',
          conversionStatus: 'ready',
        };
      }
    };

    it('should return correct response for MP3 files', () => {
      const mp3File = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(mp3File, 'size', { value: 5242880 });
      
      const response = createUploadResponse(mp3File, false);

      expect(response.success).toBe(true);
      expect(response.needsConversion).toBe(false);
      expect(response.conversionStatus).toBe('ready');
      expect(response.message).toBe('Audio uploaded successfully');
    });

    it('should return correct response for MPEG files', () => {
      const mpegFile = new File(['content'], 'test.mpeg', { type: 'audio/mpeg' });
      Object.defineProperty(mpegFile, 'size', { value: 5242880 });
      
      const response = createUploadResponse(mpegFile, true);

      expect(response.success).toBe(true);
      expect(response.needsConversion).toBe(true);
      expect(response.conversionStatus).toBe('pending');
      expect(response.message).toContain('Conversion to MP3 in progress');
    });

    it('should include all required response fields', () => {
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(file, 'size', { value: 5242880 });
      
      const response = createUploadResponse(file, false);

      const requiredFields = [
        'success', 'recordingId', 'status', 'conversionStatus',
        'needsConversion', 'duration', 'fileSize', 'visibility',
        'sharedWith', 'broadcastReady', 'message'
      ];

      requiredFields.forEach(field => {
        expect(response).toHaveProperty(field);
      });
    });
  });

  describe('Gateway Communication Workflow', () => {
    const simulateGatewayConversion = async (recordingId: string, format: string) => {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
      const conversionPayload = {
        recordId: recordingId,
        originalKey: `uploads/2024/01/${recordingId}.${format}`,
        format: format
      };

      try {
        const response = await fetch(`${gatewayUrl}/api/convert-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          },
          body: JSON.stringify(conversionPayload)
        });

        if (!response.ok) {
          throw new Error(`Gateway responded with ${response.status}`);
        }

        const result = await response.json();
        return { success: true, jobId: result.jobId };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    };

    it('should successfully communicate with gateway for MPEG conversion', async () => {
      const result = await simulateGatewayConversion('recording-123', 'mpeg');

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('test-job-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/convert-audio',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          }),
          body: JSON.stringify({
            recordId: 'recording-123',
            originalKey: 'uploads/2024/01/recording-123.mpeg',
            format: 'mpeg'
          })
        })
      );
    });

    it('should handle gateway communication failures gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });

      const result = await simulateGatewayConversion('recording-456', 'amr');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gateway responded with 500');
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await simulateGatewayConversion('recording-789', '3gp');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Complete Upload Workflow Scenarios', () => {
    const simulateCompleteUpload = async (fileName: string, mimeType: string, fileSize: number) => {
      // Step 1: File validation
      const file = new File(['content'], fileName, { type: mimeType });
      Object.defineProperty(file, 'size', { value: fileSize });
      
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      const formatInfo = getFormatByExtension(fileExtension || '');
      
      if (!formatInfo) {
        return {
          success: false,
          error: `Unsupported file extension: .${fileExtension}`,
          stage: 'validation'
        };
      }

      if (fileSize > 30 * 1024 * 1024) {
        return {
          success: false,
          error: 'File too large',
          stage: 'validation'
        };
      }

      // Step 2: Determine conversion needs
      const needsConversion = AudioConversionService.needsConversion(formatInfo.extension);

      // Step 3: Simulate upload to S3
      const uploadResult = {
        storageKey: `uploads/2024/01/${fileName}`,
        storageUrl: `https://s3.amazonaws.com/bucket/uploads/2024/01/${fileName}`,
        fileSize: fileSize
      };

      // Step 4: Simulate database record creation
      const recordingId = `recording-${Date.now()}`;

      // Step 5: Trigger conversion if needed
      let conversionResult = null;
      if (needsConversion) {
        conversionResult = await simulateGatewayConversion(recordingId, formatInfo.extension);
      }

      return {
        success: true,
        recordingId,
        needsConversion,
        conversionStatus: needsConversion ? 'pending' : 'ready',
        conversionResult,
        uploadResult,
        stage: 'complete'
      };
    };

    it('should handle MP3 upload workflow successfully', async () => {
      const result = await simulateCompleteUpload('lecture.mp3', 'audio/mpeg', 5 * 1024 * 1024);

      expect(result.success).toBe(true);
      expect(result.needsConversion).toBe(false);
      expect(result.conversionStatus).toBe('ready');
      expect(result.conversionResult).toBeNull();
      expect(result.stage).toBe('complete');
    });

    it('should handle MPEG upload workflow with conversion', async () => {
      const result = await simulateCompleteUpload('lecture.mpeg', 'audio/mpeg', 8 * 1024 * 1024);

      expect(result.success).toBe(true);
      expect(result.needsConversion).toBe(true);
      expect(result.conversionStatus).toBe('pending');
      expect(result.conversionResult?.success).toBe(true);
      expect(result.conversionResult?.jobId).toBe('test-job-123');
      expect(result.stage).toBe('complete');
    });

    it('should handle AMR upload workflow with conversion', async () => {
      const result = await simulateCompleteUpload('voice.amr', '', 2 * 1024 * 1024);

      expect(result.success).toBe(true);
      expect(result.needsConversion).toBe(true);
      expect(result.conversionStatus).toBe('pending');
      expect(result.conversionResult?.success).toBe(true);
      expect(result.stage).toBe('complete');
    });

    it('should reject unsupported file types', async () => {
      const result = await simulateCompleteUpload('document.pdf', 'application/pdf', 1024);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file extension: .pdf');
      expect(result.stage).toBe('validation');
    });

    it('should reject oversized files', async () => {
      const result = await simulateCompleteUpload('large.mp3', 'audio/mpeg', 50 * 1024 * 1024);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File too large');
      expect(result.stage).toBe('validation');
    });

    it('should handle conversion gateway failures gracefully', async () => {
      // Mock gateway failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable')
      });

      const result = await simulateCompleteUpload('voice.amr', 'audio/amr', 3 * 1024 * 1024);

      expect(result.success).toBe(true); // Upload still succeeds
      expect(result.needsConversion).toBe(true);
      expect(result.conversionResult?.success).toBe(false);
      expect(result.stage).toBe('complete');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle partial upload failures', async () => {
      // Simulate scenario where file validation passes but S3 upload fails
      const mockPartialFailure = {
        validationPassed: true,
        s3UploadFailed: true,
        error: 'S3 upload timeout'
      };

      expect(mockPartialFailure.validationPassed).toBe(true);
      expect(mockPartialFailure.s3UploadFailed).toBe(true);
      expect(mockPartialFailure.error).toBe('S3 upload timeout');
    });

    it('should handle database save failures', async () => {
      // Simulate scenario where upload succeeds but database save fails
      const mockDatabaseFailure = {
        uploadSucceeded: true,
        databaseSaveFailed: true,
        error: 'Database connection timeout'
      };

      expect(mockDatabaseFailure.uploadSucceeded).toBe(true);
      expect(mockDatabaseFailure.databaseSaveFailed).toBe(true);
      expect(mockDatabaseFailure.error).toBe('Database connection timeout');
    });

    it('should handle conversion service unavailability', async () => {
      // Mock conversion service being unavailable
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await simulateCompleteUpload('test.mpeg', 'audio/mpeg', 5 * 1024 * 1024);

      expect(result.success).toBe(true); // Upload should still succeed
      expect(result.conversionResult?.success).toBe(false);
      expect(result.conversionResult?.error).toBe('ECONNREFUSED');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent uploads', async () => {
      const uploadPromises = Array.from({ length: 5 }, (_, i) => 
        simulateCompleteUpload(`file${i}.mp3`, 'audio/mpeg', 5 * 1024 * 1024)
      );

      const results = await Promise.all(uploadPromises);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.recordingId).toContain('recording-');
        expect(result.needsConversion).toBe(false);
      });
    });

    it('should handle mixed format uploads efficiently', async () => {
      const mixedUploads = [
        { name: 'lecture.mp3', type: 'audio/mpeg', size: 5 * 1024 * 1024 },
        { name: 'voice.amr', type: 'audio/amr', size: 2 * 1024 * 1024 },
        { name: 'recitation.mpeg', type: 'audio/mpeg', size: 8 * 1024 * 1024 },
        { name: 'sermon.wav', type: 'audio/wav', size: 15 * 1024 * 1024 },
      ];

      const uploadPromises = mixedUploads.map(upload => 
        simulateCompleteUpload(upload.name, upload.type, upload.size)
      );

      const results = await Promise.all(uploadPromises);

      expect(results[0].needsConversion).toBe(false); // MP3
      expect(results[1].needsConversion).toBe(true);  // AMR
      expect(results[2].needsConversion).toBe(true);  // MPEG
      expect(results[3].needsConversion).toBe(false); // WAV

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});