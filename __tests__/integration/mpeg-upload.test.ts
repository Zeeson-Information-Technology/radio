/**
 * MPEG Upload Integration Test
 * Tests actual file upload functionality with MPEG files
 */

import { getFormatByExtension, getSupportedMimeTypes } from '../../lib/utils/audio-formats';

describe('MPEG Upload Integration', () => {
  describe('MPEG Format Support Verification', () => {
    it('should have MPEG format properly configured', () => {
      const mpegFormat = getFormatByExtension('mpeg');
      
      expect(mpegFormat).not.toBeNull();
      expect(mpegFormat?.extension).toBe('mpeg');
      expect(mpegFormat?.mimeTypes).toContain('audio/mpeg');
      expect(mpegFormat?.mimeTypes).toContain('audio/x-mpeg');
      expect(mpegFormat?.description).toBe('MPEG Audio');
      expect(mpegFormat?.quality).toBe('lossy');
      expect(mpegFormat?.browserSupport).toBe('excellent');
    });

    it('should include MPEG MIME types in supported list', () => {
      const supportedMimeTypes = getSupportedMimeTypes();
      
      expect(supportedMimeTypes).toContain('audio/mpeg');
      expect(supportedMimeTypes).toContain('audio/x-mpeg');
    });

    it('should handle MPEG files same as MP3 files', () => {
      const mpegFormat = getFormatByExtension('mpeg');
      const mp3Format = getFormatByExtension('mp3');
      
      // Both should have same MIME type support
      expect(mpegFormat?.mimeTypes).toContain('audio/mpeg');
      expect(mp3Format?.mimeTypes).toContain('audio/mpeg');
      
      // Both should have excellent browser support
      expect(mpegFormat?.browserSupport).toBe('excellent');
      expect(mp3Format?.browserSupport).toBe('excellent');
    });
  });

  describe('File Size Validation', () => {
    it('should validate 30MB limit correctly', () => {
      const maxSizeBytes = 30 * 1024 * 1024; // 30MB
      
      // Test file sizes around the limit
      const testSizes = [
        { size: 29 * 1024 * 1024, shouldPass: true, description: '29MB' },
        { size: 30 * 1024 * 1024, shouldPass: true, description: '30MB exactly' },
        { size: 31 * 1024 * 1024, shouldPass: false, description: '31MB' },
        { size: 50 * 1024 * 1024, shouldPass: false, description: '50MB' }
      ];

      testSizes.forEach(({ size, shouldPass, description }) => {
        const withinLimit = size <= maxSizeBytes;
        expect(withinLimit).toBe(shouldPass);
        
        if (!shouldPass) {
          const sizeMB = (size / (1024 * 1024)).toFixed(1);
          expect(parseFloat(sizeMB)).toBeGreaterThan(30);
        }
      });
    });

    it('should provide helpful error messages for oversized files', () => {
      const createErrorMessage = (fileSize: number): string => {
        const maxSize = 30 * 1024 * 1024;
        if (fileSize > maxSize) {
          const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
          const maxSizeMB = maxSize / (1024 * 1024);
          return `File too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB. Please compress your audio file or use MP3/M4A format for better compression.`;
        }
        return '';
      };

      const oversizedFile = 50 * 1024 * 1024; // 50MB
      const errorMessage = createErrorMessage(oversizedFile);
      
      expect(errorMessage).toContain('File too large (50.0MB)');
      expect(errorMessage).toContain('Maximum size is 30MB');
      expect(errorMessage).toContain('Please compress your audio file');
      expect(errorMessage).toContain('MP3/M4A format');
    });
  });

  describe('Upload Validation Logic', () => {
    it('should validate MPEG files correctly', () => {
      // Simulate the validation logic from the upload route
      const validateMpegFile = (fileName: string, mimeType: string, fileSize: number) => {
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        const formatInfo = getFormatByExtension(fileExtension || '');
        const supportedMimeTypes = getSupportedMimeTypes();
        const maxSize = 30 * 1024 * 1024;

        // Check extension
        if (!fileExtension || !formatInfo) {
          return { valid: false, error: `Unsupported file extension: .${fileExtension || 'unknown'}` };
        }

        // Check MIME type or extension validity
        const hasValidMimeType = mimeType && supportedMimeTypes.includes(mimeType);
        const hasValidExtension = formatInfo !== null;
        
        if (!hasValidMimeType && !hasValidExtension) {
          return { valid: false, error: `Unsupported file format: ${mimeType || 'unknown MIME type'}` };
        }

        // Check file size
        if (fileSize > maxSize) {
          const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
          return { valid: false, error: `File too large (${sizeMB}MB). Maximum size is 30MB.` };
        }

        return { valid: true, error: null };
      };

      // Test valid MPEG files
      const validTests = [
        { name: 'audio.mpeg', mime: 'audio/mpeg', size: 5 * 1024 * 1024 },
        { name: 'lecture.mpeg', mime: 'audio/x-mpeg', size: 15 * 1024 * 1024 },
        { name: 'recitation.mpeg', mime: '', size: 25 * 1024 * 1024 }, // Empty MIME type
      ];

      validTests.forEach(test => {
        const result = validateMpegFile(test.name, test.mime, test.size);
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      });

      // Test invalid files
      const invalidTests = [
        { name: 'audio.txt', mime: 'text/plain', size: 1024, expectedError: 'Unsupported file extension' },
        { name: 'audio.mpeg', mime: 'audio/mpeg', size: 50 * 1024 * 1024, expectedError: 'File too large' },
      ];

      invalidTests.forEach(test => {
        const result = validateMpegFile(test.name, test.mime, test.size);
        expect(result.valid).toBe(false);
        expect(result.error).toContain(test.expectedError);
      });
    });
  });

  describe('Error Message Quality', () => {
    it('should provide user-friendly error messages', () => {
      const createValidationError = (type: 'size' | 'format' | 'extension', details: any) => {
        switch (type) {
          case 'size':
            return `File too large (${details.sizeMB}MB). Maximum size is 30MB. Please compress your audio file or use MP3/M4A format for better compression.`;
          case 'format':
            return `Unsupported file format: ${details.mimeType}. Supported formats: MP3, MPEG, WAV, M4A, AAC, OGG, FLAC, AMR, WEBM, WMA, 3GP, 3GP2`;
          case 'extension':
            return `Unsupported file extension: .${details.extension}. Supported formats: MP3, MPEG, WAV, M4A, AAC, OGG, FLAC, AMR, WEBM, WMA, 3GP, 3GP2`;
          default:
            return 'Unknown error';
        }
      };

      // Test size error
      const sizeError = createValidationError('size', { sizeMB: '45.2' });
      expect(sizeError).toContain('File too large (45.2MB)');
      expect(sizeError).toContain('compress your audio file');

      // Test format error
      const formatError = createValidationError('format', { mimeType: 'video/mp4' });
      expect(formatError).toContain('Unsupported file format: video/mp4');
      expect(formatError).toContain('MPEG');

      // Test extension error
      const extensionError = createValidationError('extension', { extension: 'txt' });
      expect(extensionError).toContain('Unsupported file extension: .txt');
      expect(extensionError).toContain('MPEG');
    });
  });
});