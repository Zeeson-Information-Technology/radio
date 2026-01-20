/**
 * Audio Format Utilities Tests
 * Tests for audio format validation and MPEG support
 */

import { 
  getFormatByExtension, 
  getSupportedMimeTypes, 
  isAudioFormatSupported,
  SUPPORTED_AUDIO_FORMATS,
  estimateFileSize
} from '../../lib/utils/audio-formats';

describe('Audio Format Utilities', () => {
  describe('MPEG Support', () => {
    it('should support MPEG extension', () => {
      const format = getFormatByExtension('mpeg');
      expect(format).not.toBeNull();
      expect(format?.extension).toBe('mpeg');
      expect(format?.mimeTypes).toContain('audio/mpeg');
    });

    it('should include MPEG in supported formats', () => {
      expect(SUPPORTED_AUDIO_FORMATS.mpeg).toBeDefined();
      expect(SUPPORTED_AUDIO_FORMATS.mpeg.extension).toBe('mpeg');
      expect(SUPPORTED_AUDIO_FORMATS.mpeg.mimeTypes).toContain('audio/mpeg');
    });

    it('should validate MPEG MIME type as supported', () => {
      expect(isAudioFormatSupported('audio/mpeg')).toBe(true);
      expect(isAudioFormatSupported('audio/x-mpeg')).toBe(true);
    });
  });

  describe('File Size Validation', () => {
    it('should calculate correct file sizes for different formats', () => {
      // Test MP3 at 128kbps for 5 minutes
      const mp3Result = estimateFileSize(5, 'mp3', 128);
      expect(mp3Result.sizeMB).toBeCloseTo(4.7, 1); // ~4.7MB (adjusted for actual calculation)
      expect(mp3Result.withinLimit).toBe(true);
    });

    it('should identify files that exceed 30MB limit', () => {
      // Test high bitrate file that would exceed limit
      const largeResult = estimateFileSize(30, 'wav', 1411); // 30 min at CD quality
      expect(largeResult.withinLimit).toBe(false);
      expect(largeResult.recommendation).toBeDefined();
    });

    it('should provide recommendations for oversized files', () => {
      const oversizedResult = estimateFileSize(45, 'mp3', 320); // 45 min at 320kbps
      expect(oversizedResult.withinLimit).toBe(false);
      expect(oversizedResult.recommendation).toContain('split into multiple parts');
    });
  });

  describe('Format Validation', () => {
    it('should support all expected audio formats', () => {
      const expectedFormats = [
        'mp3', 'mpeg', 'wav', 'm4a', 'aac', 'ogg', 'flac', 
        'amr', 'amr-wb', 'webm', 'wma', '3gp', '3gp2'
      ];

      expectedFormats.forEach(format => {
        const formatInfo = getFormatByExtension(format);
        expect(formatInfo).not.toBeNull();
        expect(formatInfo?.extension).toBe(format);
      });
    });

    it('should reject unsupported formats', () => {
      const unsupportedFormats = ['txt', 'pdf', 'mp4', 'avi', 'doc'];
      
      unsupportedFormats.forEach(format => {
        const formatInfo = getFormatByExtension(format);
        expect(formatInfo).toBeNull();
      });
    });

    it('should handle case-insensitive extensions', () => {
      expect(getFormatByExtension('MP3')).not.toBeNull();
      expect(getFormatByExtension('MPEG')).not.toBeNull();
      expect(getFormatByExtension('WaV')).not.toBeNull();
    });

    it('should handle extensions with dots', () => {
      expect(getFormatByExtension('.mp3')).not.toBeNull();
      expect(getFormatByExtension('.mpeg')).not.toBeNull();
    });
  });

  describe('MIME Type Support', () => {
    it('should return all supported MIME types', () => {
      const mimeTypes = getSupportedMimeTypes();
      expect(mimeTypes).toContain('audio/mpeg');
      expect(mimeTypes).toContain('audio/wav');
      expect(mimeTypes).toContain('audio/mp4');
      expect(mimeTypes.length).toBeGreaterThan(10);
    });

    it('should not have duplicate MIME types', () => {
      const mimeTypes = getSupportedMimeTypes();
      const uniqueMimeTypes = [...new Set(mimeTypes)];
      expect(mimeTypes.length).toBe(uniqueMimeTypes.length);
    });
  });

  describe('Browser Compatibility', () => {
    it('should identify formats with excellent browser support', () => {
      const mp3Format = getFormatByExtension('mp3');
      const mpegFormat = getFormatByExtension('mpeg');
      
      expect(mp3Format?.browserSupport).toBe('excellent');
      expect(mpegFormat?.browserSupport).toBe('excellent');
    });

    it('should identify formats with limited browser support', () => {
      const amrFormat = getFormatByExtension('amr');
      const threegpFormat = getFormatByExtension('3gp');
      
      expect(amrFormat?.browserSupport).toBe('limited');
      expect(threegpFormat?.browserSupport).toBe('limited');
    });
  });
});