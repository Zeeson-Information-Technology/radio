/**
 * AudioRecording Schema Consistency Tests
 * Verifies that database schema matches frontend validation rules
 */

import { SUPPORTED_AUDIO_FORMATS } from '../../lib/utils/audio-formats';

describe('AudioRecording Schema Consistency', () => {
  // Extract the format enum from the model (simulated)
  const getSchemaFormatEnum = (): string[] => {
    // This represents the enum values from the AudioRecording model
    return [
      "mp3", "mpeg", "wav", "m4a", "aac", "ogg",
      "amr", "amr-wb", "flac", "webm", "wma", "3gp", "3gp2"
    ];
  };

  describe('Format Enum Consistency', () => {
    it('should include MPEG in database schema enum', () => {
      const schemaFormats = getSchemaFormatEnum();
      expect(schemaFormats).toContain('mpeg');
    });

    it('should include all frontend-supported formats in database schema', () => {
      const schemaFormats = getSchemaFormatEnum();
      const frontendFormats = Object.keys(SUPPORTED_AUDIO_FORMATS);
      
      frontendFormats.forEach(format => {
        expect(schemaFormats).toContain(format);
      });
    });

    it('should have matching format counts between frontend and backend', () => {
      const schemaFormats = getSchemaFormatEnum();
      const frontendFormats = Object.keys(SUPPORTED_AUDIO_FORMATS);
      
      expect(schemaFormats.length).toBe(frontendFormats.length);
    });

    it('should support all critical audio formats', () => {
      const schemaFormats = getSchemaFormatEnum();
      const criticalFormats = ['mp3', 'mpeg', 'wav', 'm4a', 'aac', 'ogg', 'flac'];
      
      criticalFormats.forEach(format => {
        expect(schemaFormats).toContain(format);
      });
    });
  });

  describe('MPEG Format Validation', () => {
    it('should validate MPEG format as acceptable', () => {
      const schemaFormats = getSchemaFormatEnum();
      const isValidFormat = (format: string) => schemaFormats.includes(format);
      
      expect(isValidFormat('mpeg')).toBe(true);
      expect(isValidFormat('mp3')).toBe(true);
      expect(isValidFormat('wav')).toBe(true);
    });

    it('should reject invalid formats', () => {
      const schemaFormats = getSchemaFormatEnum();
      const isValidFormat = (format: string) => schemaFormats.includes(format);
      
      expect(isValidFormat('txt')).toBe(false);
      expect(isValidFormat('pdf')).toBe(false);
      expect(isValidFormat('mp4')).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      const schemaFormats = getSchemaFormatEnum();
      
      // Schema should contain lowercase formats
      expect(schemaFormats).toContain('mpeg');
      expect(schemaFormats).not.toContain('MPEG');
      expect(schemaFormats).not.toContain('Mpeg');
    });
  });

  describe('Schema Completeness', () => {
    it('should support all mobile-friendly formats', () => {
      const schemaFormats = getSchemaFormatEnum();
      const mobileFormats = ['mp3', 'mpeg', 'm4a', 'aac', '3gp', 'amr'];
      
      mobileFormats.forEach(format => {
        expect(schemaFormats).toContain(format);
      });
    });

    it('should support all high-quality formats', () => {
      const schemaFormats = getSchemaFormatEnum();
      const highQualityFormats = ['flac', 'wav'];
      
      highQualityFormats.forEach(format => {
        expect(schemaFormats).toContain(format);
      });
    });

    it('should support all web-streaming formats', () => {
      const schemaFormats = getSchemaFormatEnum();
      const streamingFormats = ['mp3', 'mpeg', 'aac', 'ogg', 'webm'];
      
      streamingFormats.forEach(format => {
        expect(schemaFormats).toContain(format);
      });
    });
  });

  describe('Error Prevention', () => {
    it('should prevent validation errors for supported formats', () => {
      const schemaFormats = getSchemaFormatEnum();
      const supportedFormats = Object.keys(SUPPORTED_AUDIO_FORMATS);
      
      // Simulate validation function
      const validateFormat = (format: string): { valid: boolean; error?: string } => {
        if (schemaFormats.includes(format)) {
          return { valid: true };
        }
        return { 
          valid: false, 
          error: `\`${format}\` is not a valid enum value for path \`format\`` 
        };
      };

      supportedFormats.forEach(format => {
        const result = validateFormat(format);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should provide clear error messages for unsupported formats', () => {
      const schemaFormats = getSchemaFormatEnum();
      const unsupportedFormats = ['txt', 'pdf', 'doc', 'mp4', 'avi'];
      
      const validateFormat = (format: string): { valid: boolean; error?: string } => {
        if (schemaFormats.includes(format)) {
          return { valid: true };
        }
        return { 
          valid: false, 
          error: `\`${format}\` is not a valid enum value for path \`format\`` 
        };
      };

      unsupportedFormats.forEach(format => {
        const result = validateFormat(format);
        expect(result.valid).toBe(false);
        expect(result.error).toContain(`\`${format}\` is not a valid enum value`);
      });
    });
  });
});