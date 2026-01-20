/**
 * Audio Upload Frontend Validation Tests
 * Tests for client-side file validation including MPEG support and 30MB limit
 */

import { getFormatByExtension, getSupportedMimeTypes } from '../../lib/utils/audio-formats';

// Mock File constructor for testing
class MockFile {
  constructor(public content: string[], public name: string, public options: any = {}) {
    this.size = content.join('').length;
    this.type = options.type || '';
  }
  size: number;
  type: string;
}

describe('Audio Upload Frontend Validation', () => {
  // Simulate the validation function from AudioUpload component
  const validateFile = (file: MockFile): string | null => {
    const maxFileSize = 30 * 1024 * 1024; // 30MB
    const supportedMimeTypes = getSupportedMimeTypes();
    const supportedExtensions = Object.keys({
      mp3: true, mpeg: true, wav: true, m4a: true, aac: true, ogg: true, 
      flac: true, amr: true, 'amr-wb': true, webm: true, wma: true, 
      '3gp': true, '3gp2': true
    }).map(ext => `.${ext}`);

    // Get file extension first
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    
    // Check if extension is supported
    if (!fileExtension || !getFormatByExtension(fileExtension)) {
      return `Unsupported file extension: .${fileExtension || 'unknown'}. Please use: ${supportedExtensions.join(", ")}`;
    }

    // For certain formats (like AMR), MIME type might be empty or unrecognized
    // So we prioritize file extension validation over MIME type
    const formatInfo = getFormatByExtension(fileExtension);
    const hasValidMimeType = file.type && supportedMimeTypes.includes(file.type);
    const hasValidExtension = formatInfo !== null;
    
    // Accept if either MIME type is valid OR extension is valid (for formats like AMR)
    if (!hasValidMimeType && !hasValidExtension) {
      return `Unsupported file format: ${file.type || 'unknown'}. Please use: ${supportedExtensions.join(", ")}`;
    }

    // Check file size with helpful guidance
    if (file.size > maxFileSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = maxFileSize / (1024 * 1024);
      return `File too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB. Please compress your audio file or use a more efficient format like MP3 or M4A.`;
    }

    return null;
  };

  describe('MPEG File Support', () => {
    it('should accept MPEG files with correct MIME type', () => {
      const mpegFile = new MockFile(['fake mpeg content'], 'test-audio.mpeg', {
        type: 'audio/mpeg'
      });

      const error = validateFile(mpegFile);
      expect(error).toBeNull();
    });

    it('should accept MPEG files with alternative MIME type', () => {
      const mpegFile = new MockFile(['fake mpeg content'], 'test-audio.mpeg', {
        type: 'audio/x-mpeg'
      });

      const error = validateFile(mpegFile);
      expect(error).toBeNull();
    });

    it('should accept MPEG files even with empty MIME type (based on extension)', () => {
      const mpegFile = new MockFile(['fake mpeg content'], 'test-audio.mpeg', {
        type: ''
      });

      const error = validateFile(mpegFile);
      expect(error).toBeNull();
    });
  });

  describe('30MB File Size Limit', () => {
    it('should reject files larger than 30MB', () => {
      // Create a 31MB file
      const largeContent = 'x'.repeat(31 * 1024 * 1024);
      const largeFile = new MockFile([largeContent], 'large-audio.mp3', {
        type: 'audio/mpeg'
      });

      const error = validateFile(largeFile);
      expect(error).not.toBeNull();
      expect(error).toContain('File too large (31.0MB)');
      expect(error).toContain('Maximum size is 30MB');
    });

    it('should accept files exactly at 30MB limit', () => {
      // Create exactly 30MB file
      const maxContent = 'x'.repeat(30 * 1024 * 1024);
      const maxFile = new MockFile([maxContent], 'max-size-audio.mp3', {
        type: 'audio/mpeg'
      });

      const error = validateFile(maxFile);
      expect(error).toBeNull();
    });

    it('should accept small files under 1MB', () => {
      const smallFile = new MockFile(['small content'], 'small-audio.mp3', {
        type: 'audio/mpeg'
      });

      const error = validateFile(smallFile);
      expect(error).toBeNull();
    });

    it('should provide helpful error message for oversized files', () => {
      const oversizedContent = 'x'.repeat(50 * 1024 * 1024); // 50MB
      const oversizedFile = new MockFile([oversizedContent], 'huge-audio.wav', {
        type: 'audio/wav'
      });

      const error = validateFile(oversizedFile);
      expect(error).toContain('File too large (50.0MB)');
      expect(error).toContain('Please compress your audio file');
      expect(error).toContain('MP3 or M4A');
    });
  });

  describe('Supported Format Validation', () => {
    it('should accept all supported audio formats', () => {
      const supportedFormats = [
        { ext: 'mp3', mime: 'audio/mpeg' },
        { ext: 'mpeg', mime: 'audio/mpeg' },
        { ext: 'wav', mime: 'audio/wav' },
        { ext: 'm4a', mime: 'audio/mp4' },
        { ext: 'aac', mime: 'audio/aac' },
        { ext: 'ogg', mime: 'audio/ogg' },
        { ext: 'flac', mime: 'audio/flac' },
        { ext: 'amr', mime: 'audio/amr' },
        { ext: 'webm', mime: 'audio/webm' },
        { ext: '3gp', mime: 'audio/3gpp' }
      ];

      supportedFormats.forEach(format => {
        const file = new MockFile(['test content'], `test-audio.${format.ext}`, {
          type: format.mime
        });

        const error = validateFile(file);
        expect(error).toBeNull();
      });
    });

    it('should reject unsupported file formats', () => {
      const unsupportedFormats = [
        { ext: 'txt', mime: 'text/plain' },
        { ext: 'pdf', mime: 'application/pdf' },
        { ext: 'mp4', mime: 'video/mp4' },
        { ext: 'avi', mime: 'video/avi' },
        { ext: 'doc', mime: 'application/msword' }
      ];

      unsupportedFormats.forEach(format => {
        const file = new MockFile(['test content'], `test-file.${format.ext}`, {
          type: format.mime
        });

        const error = validateFile(file);
        expect(error).not.toBeNull();
        expect(error).toContain('Unsupported file extension');
      });
    });

    it('should handle files with missing extensions', () => {
      const noExtFile = new MockFile(['test content'], 'audio-file-no-extension', {
        type: 'audio/mpeg'
      });

      const error = validateFile(noExtFile);
      expect(error).not.toBeNull();
      expect(error).toContain('Unsupported file extension: .audio-file-no-extension');
    });
  });

  describe('Edge Cases', () => {
    it('should handle AMR files with empty MIME type', () => {
      const amrFile = new MockFile(['amr content'], 'voice-memo.amr', {
        type: '' // AMR files often have empty MIME type
      });

      const error = validateFile(amrFile);
      expect(error).toBeNull(); // Should accept based on extension
    });

    it('should handle case-insensitive extensions', () => {
      const upperCaseFile = new MockFile(['test content'], 'TEST-AUDIO.MP3', {
        type: 'audio/mpeg'
      });

      const error = validateFile(upperCaseFile);
      expect(error).toBeNull();
    });

    it('should handle mixed case extensions', () => {
      const mixedCaseFile = new MockFile(['test content'], 'test-audio.MpEg', {
        type: 'audio/mpeg'
      });

      const error = validateFile(mixedCaseFile);
      expect(error).toBeNull();
    });

    it('should handle zero-byte files', () => {
      const emptyFile = new MockFile([''], 'empty-audio.mp3', {
        type: 'audio/mpeg'
      });

      const error = validateFile(emptyFile);
      expect(error).toBeNull(); // Should accept empty files
    });
  });
});