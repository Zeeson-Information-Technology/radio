/**
 * Audio Format Validation Unit Tests
 * Comprehensive tests for audio format validation logic
 */

import { 
  getFormatByExtension, 
  getFormatByMimeType,
  getSupportedMimeTypes, 
  isAudioFormatSupported,
  SUPPORTED_AUDIO_FORMATS,
  estimateFileSize,
  getBrowserCompatibility,
  getOptimalSettings,
  getRecommendedFormats,
  getFormatDescription
} from '../../lib/utils/audio-formats';

describe('Audio Format Validation', () => {
  describe('Extension Validation', () => {
    it('should validate all supported extensions', () => {
      const supportedExtensions = Object.keys(SUPPORTED_AUDIO_FORMATS);
      
      supportedExtensions.forEach(ext => {
        const format = getFormatByExtension(ext);
        expect(format).not.toBeNull();
        expect(format?.extension).toBe(ext);
      });
    });

    it('should handle case-insensitive extensions', () => {
      const testCases = [
        { input: 'MP3', expected: 'mp3' },
        { input: 'MPEG', expected: 'mpeg' },
        { input: 'WaV', expected: 'wav' },
        { input: 'M4A', expected: 'm4a' },
        { input: 'AMR', expected: 'amr' },
      ];

      testCases.forEach(({ input, expected }) => {
        const format = getFormatByExtension(input);
        expect(format).not.toBeNull();
        expect(format?.extension).toBe(expected);
      });
    });

    it('should handle extensions with dots', () => {
      const testCases = ['.mp3', '.mpeg', '.wav', '.m4a', '.amr'];
      
      testCases.forEach(ext => {
        const format = getFormatByExtension(ext);
        expect(format).not.toBeNull();
        expect(format?.extension).toBe(ext.substring(1));
      });
    });

    it('should reject unsupported extensions', () => {
      const unsupportedExtensions = [
        'txt', 'pdf', 'doc', 'docx', 'mp4', 'avi', 'mov', 
        'jpg', 'png', 'gif', 'zip', 'rar', 'exe'
      ];

      unsupportedExtensions.forEach(ext => {
        const format = getFormatByExtension(ext);
        expect(format).toBeNull();
      });
    });

    it('should handle empty and null extensions', () => {
      expect(getFormatByExtension('')).toBeNull();
      expect(getFormatByExtension(' ')).toBeNull();
    });
  });

  describe('MIME Type Validation', () => {
    it('should validate all supported MIME types', () => {
      const allMimeTypes = getSupportedMimeTypes();
      
      allMimeTypes.forEach(mimeType => {
        expect(isAudioFormatSupported(mimeType)).toBe(true);
        const format = getFormatByMimeType(mimeType);
        expect(format).not.toBeNull();
      });
    });

    it('should handle case-insensitive MIME types', () => {
      const testCases = [
        'AUDIO/MPEG',
        'Audio/Mp3',
        'AUDIO/WAV',
        'audio/MP4',
      ];

      testCases.forEach(mimeType => {
        expect(isAudioFormatSupported(mimeType)).toBe(true);
      });
    });

    it('should reject unsupported MIME types', () => {
      const unsupportedMimeTypes = [
        'video/mp4',
        'text/plain',
        'application/pdf',
        'image/jpeg',
        'application/json',
        'video/avi',
        'audio/unsupported',
      ];

      unsupportedMimeTypes.forEach(mimeType => {
        expect(isAudioFormatSupported(mimeType)).toBe(false);
        expect(getFormatByMimeType(mimeType)).toBeNull();
      });
    });

    it('should not have duplicate MIME types', () => {
      const mimeTypes = getSupportedMimeTypes();
      const uniqueMimeTypes = [...new Set(mimeTypes)];
      expect(mimeTypes.length).toBe(uniqueMimeTypes.length);
    });

    it('should handle empty and null MIME types', () => {
      expect(isAudioFormatSupported('')).toBe(false);
      expect(getFormatByMimeType('')).toBeNull();
    });
  });

  describe('File Size Validation', () => {
    it('should calculate correct file sizes for different bitrates', () => {
      const testCases = [
        { duration: 5, format: 'mp3', bitrate: 128, expectedMB: 4.7 },
        { duration: 10, format: 'mp3', bitrate: 64, expectedMB: 4.7 },
        { duration: 3, format: 'mp3', bitrate: 320, expectedMB: 7.0 },
        { duration: 1, format: 'amr', bitrate: 12.2, expectedMB: 0.1 },
      ];

      testCases.forEach(({ duration, format, bitrate, expectedMB }) => {
        const result = estimateFileSize(duration, format, bitrate);
        expect(result.sizeMB).toBeCloseTo(expectedMB, 0);
      });
    });

    it('should identify files within 30MB limit', () => {
      const validSizes = [
        { duration: 20, bitrate: 128 }, // ~18.8MB
        { duration: 30, bitrate: 64 },  // ~14.1MB
        { duration: 5, bitrate: 320 },  // ~11.7MB
      ];

      validSizes.forEach(({ duration, bitrate }) => {
        const result = estimateFileSize(duration, 'mp3', bitrate);
        expect(result.withinLimit).toBe(true);
        expect(result.recommendation).toBeUndefined();
      });
    });

    it('should identify files exceeding 30MB limit', () => {
      const oversizedFiles = [
        { duration: 45, bitrate: 128 }, // ~42.2MB
        { duration: 60, bitrate: 96 },  // ~42.2MB
        { duration: 30, bitrate: 320 }, // ~70.3MB
      ];

      oversizedFiles.forEach(({ duration, bitrate }) => {
        const result = estimateFileSize(duration, 'mp3', bitrate);
        expect(result.withinLimit).toBe(false);
        expect(result.recommendation).toBeDefined();
      });
    });

    it('should provide appropriate recommendations for oversized files', () => {
      // Short duration, high bitrate
      const shortHighBitrate = estimateFileSize(15, 'mp3', 320);
      expect(shortHighBitrate.recommendation).toContain('MP3 96kbps or M4A 64kbps');

      // Long duration
      const longDuration = estimateFileSize(60, 'mp3', 128);
      expect(longDuration.recommendation).toContain('split into multiple parts');
    });

    it('should handle edge cases', () => {
      // Zero duration
      const zeroDuration = estimateFileSize(0, 'mp3', 128);
      expect(zeroDuration.sizeMB).toBe(0);
      expect(zeroDuration.withinLimit).toBe(true);

      // Very high bitrate
      const highBitrate = estimateFileSize(1, 'wav', 1411);
      expect(highBitrate.sizeMB).toBeGreaterThan(10);
    });
  });

  describe('Browser Compatibility', () => {
    it('should identify excellent browser support formats', () => {
      const excellentFormats = ['mp3', 'mpeg', 'wav', 'm4a'];
      
      excellentFormats.forEach(format => {
        const compatibility = getBrowserCompatibility(format);
        expect(compatibility.canPlay).toBe(true);
        expect(compatibility.needsConversion).toBe(false);
        expect(compatibility.recommendedAlternative).toBeUndefined();
      });
    });

    it('should identify good browser support formats', () => {
      const goodFormats = ['aac', 'ogg', 'flac'];
      
      goodFormats.forEach(format => {
        const compatibility = getBrowserCompatibility(format);
        expect(compatibility.canPlay).toBe(true);
        expect(compatibility.needsConversion).toBe(false);
      });
    });

    it('should identify limited browser support formats', () => {
      const limitedFormats = ['amr', 'amr-wb', '3gp', '3gp2'];
      
      limitedFormats.forEach(format => {
        const compatibility = getBrowserCompatibility(format);
        expect(compatibility.canPlay).toBe(false);
        expect(compatibility.needsConversion).toBe(true);
        expect(compatibility.recommendedAlternative).toBe('mp3');
      });
    });

    it('should identify poor browser support formats', () => {
      const poorFormats = ['wma'];
      
      poorFormats.forEach(format => {
        const compatibility = getBrowserCompatibility(format);
        expect(compatibility.canPlay).toBe(false);
        expect(compatibility.needsConversion).toBe(true);
        expect(compatibility.recommendedAlternative).toBe('mp3');
      });
    });

    it('should handle unknown formats', () => {
      const compatibility = getBrowserCompatibility('unknown');
      expect(compatibility.canPlay).toBe(false);
      expect(compatibility.needsConversion).toBe(true);
      expect(compatibility.recommendedAlternative).toBe('mp3');
    });
  });

  describe('Format Recommendations', () => {
    it('should provide correct recommendations for different content types', () => {
      const testCases = [
        { type: 'lecture', expected: ['mp3', 'm4a', 'aac'] },
        { type: 'quran', expected: ['flac', 'wav', 'm4a', 'mp3'] },
        { type: 'voice', expected: ['amr', 'amr-wb', '3gp', 'mp3'] },
        { type: 'archival', expected: ['flac', 'wav'] },
        { type: 'streaming', expected: ['mp3', 'm4a', 'webm', 'aac'] },
        { type: 'mobile', expected: ['mp3', 'm4a', '3gp', 'amr'] },
      ];

      testCases.forEach(({ type, expected }) => {
        const recommendations = getRecommendedFormats(type as any);
        expect(recommendations).toEqual(expected);
      });
    });

    it('should default to lecture recommendations for unknown types', () => {
      const recommendations = getRecommendedFormats('unknown' as any);
      expect(recommendations).toEqual(['mp3', 'm4a', 'aac']);
    });
  });

  describe('Optimal Settings', () => {
    it('should provide optimal settings for lectures', () => {
      // Short lecture
      const shortLecture = getOptimalSettings('lecture', 15);
      expect(shortLecture.format).toBe('mp3');
      expect(shortLecture.bitrate).toBe(96);
      expect(shortLecture.description).toContain('Good quality for speech');

      // Long lecture
      const longLecture = getOptimalSettings('lecture', 45);
      expect(longLecture.format).toBe('mp3');
      expect(longLecture.bitrate).toBe(64);
      expect(longLecture.description).toContain('Optimized for longer lectures');
    });

    it('should provide optimal settings for Quran recitation', () => {
      const quranSettings = getOptimalSettings('quran', 20);
      expect(quranSettings.format).toBe('m4a');
      expect(quranSettings.bitrate).toBe(96);
      expect(quranSettings.description).toContain('High quality for Quran recitation');
    });

    it('should provide optimal settings for voice recordings', () => {
      const voiceSettings = getOptimalSettings('voice', 10);
      expect(voiceSettings.format).toBe('amr');
      expect(voiceSettings.bitrate).toBe(12.2);
      expect(voiceSettings.description).toContain('Optimized for voice recordings');
    });

    it('should include estimated file sizes', () => {
      const settings = getOptimalSettings('lecture', 20);
      expect(settings.estimatedSize).toBeGreaterThan(0);
      expect(typeof settings.estimatedSize).toBe('number');
    });
  });

  describe('Format Descriptions', () => {
    it('should provide user-friendly format descriptions', () => {
      const testCases = [
        { ext: 'mp3', expected: 'MP3 (MPEG Audio Layer III)' },
        { ext: 'mpeg', expected: 'MPEG (MPEG Audio)' },
        { ext: 'wav', expected: 'WAV (Waveform Audio File Format)' },
        { ext: 'amr', expected: 'AMR (Adaptive Multi-Rate)' },
      ];

      testCases.forEach(({ ext, expected }) => {
        const description = getFormatDescription(ext);
        expect(description).toBe(expected);
      });
    });

    it('should handle unknown formats gracefully', () => {
      const description = getFormatDescription('unknown');
      expect(description).toBe('UNKNOWN');
    });

    it('should handle case-insensitive input', () => {
      expect(getFormatDescription('MP3')).toBe('MP3 (MPEG Audio Layer III)');
      expect(getFormatDescription('wav')).toBe('WAV (Waveform Audio File Format)');
    });
  });

  describe('Format Quality Information', () => {
    it('should correctly categorize lossy formats', () => {
      const lossyFormats = ['mp3', 'mpeg', 'm4a', 'aac', 'ogg', 'amr', 'amr-wb', 'webm', 'wma', '3gp', '3gp2'];
      
      lossyFormats.forEach(format => {
        const formatInfo = getFormatByExtension(format);
        expect(formatInfo?.quality).toBe('lossy');
      });
    });

    it('should correctly categorize lossless formats', () => {
      const losslessFormats = ['wav', 'flac'];
      
      losslessFormats.forEach(format => {
        const formatInfo = getFormatByExtension(format);
        expect(formatInfo?.quality).toBe('lossless');
      });
    });

    it('should provide meaningful common use descriptions', () => {
      const formatInfo = getFormatByExtension('mp3');
      expect(formatInfo?.commonUse).toContain('lectures');
      
      const amrInfo = getFormatByExtension('amr');
      expect(amrInfo?.commonUse.toLowerCase()).toContain('voice');
      
      const flacInfo = getFormatByExtension('flac');
      expect(flacInfo?.commonUse.toLowerCase()).toContain('quality');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      // These should not throw errors, but return null
      expect(() => getFormatByExtension(null as any)).not.toThrow();
      expect(() => getFormatByExtension(undefined as any)).not.toThrow();
      expect(() => getFormatByMimeType(null as any)).not.toThrow();
      expect(() => getFormatByMimeType(undefined as any)).not.toThrow();
      
      // They should return null for invalid inputs
      expect(getFormatByExtension('')).toBeNull();
      expect(getFormatByMimeType('')).toBeNull();
    });

    it('should handle whitespace-only inputs', () => {
      expect(getFormatByExtension('   ')).toBeNull();
      expect(getFormatByMimeType('   ')).toBeNull();
      expect(isAudioFormatSupported('   ')).toBe(false);
    });

    it('should handle special characters in extensions', () => {
      expect(getFormatByExtension('mp3!')).toBeNull();
      expect(getFormatByExtension('mp3@')).toBeNull();
      expect(getFormatByExtension('mp3#')).toBeNull();
    });

    it('should handle very long inputs', () => {
      const longString = 'a'.repeat(1000);
      expect(getFormatByExtension(longString)).toBeNull();
      expect(getFormatByMimeType(longString)).toBeNull();
    });

    it('should handle negative values in file size calculations', () => {
      const result = estimateFileSize(-5, 'mp3', 128);
      // Negative duration should result in 0 or negative size, but within limit should be true for 0 or negative
      expect(result.sizeMB).toBeLessThanOrEqual(0);
      expect(result.withinLimit).toBe(true);
    });

    it('should handle zero bitrate in file size calculations', () => {
      const result = estimateFileSize(10, 'mp3', 0);
      expect(result.sizeMB).toBe(0);
      expect(result.withinLimit).toBe(true);
    });
  });

  describe('Performance and Consistency', () => {
    it('should return consistent results for repeated calls', () => {
      const extension = 'mp3';
      const mimeType = 'audio/mpeg';
      
      // Call multiple times
      for (let i = 0; i < 10; i++) {
        const format1 = getFormatByExtension(extension);
        const format2 = getFormatByMimeType(mimeType);
        
        expect(format1).not.toBeNull();
        expect(format2).not.toBeNull();
        expect(format1?.extension).toBe('mp3');
        expect(format2?.extension).toBe('mp3');
      }
    });

    it('should handle concurrent calls efficiently', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve(getFormatByExtension('mp3'))
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result?.extension).toBe('mp3');
      });
    });

    it('should maintain format data integrity', () => {
      // Verify that format data hasn't been accidentally modified
      const mp3Format = getFormatByExtension('mp3');
      expect(mp3Format?.mimeTypes).toContain('audio/mpeg');
      expect(mp3Format?.browserSupport).toBe('excellent');
      
      const amrFormat = getFormatByExtension('amr');
      expect(amrFormat?.browserSupport).toBe('limited');
    });
  });
});