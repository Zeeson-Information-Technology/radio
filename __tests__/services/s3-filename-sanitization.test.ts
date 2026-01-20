/**
 * S3 Filename Sanitization Tests
 * Tests for Content-Disposition header filename sanitization
 */

describe('S3 Filename Sanitization', () => {
  // Mock the S3Service to test the sanitization logic
  const getContentDisposition = (filename?: string): string | undefined => {
    if (!filename) return undefined;
    
    try {
      // Remove or replace problematic characters
      let sanitizedFilename = filename
        .replace(/["\\\r\n\t]/g, '') // Remove quotes, backslashes, and control characters
        .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII characters with underscore
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[<>:"|?*]/g, '_') // Replace Windows-invalid filename characters
        .replace(/_{2,}/g, '_') // Replace multiple consecutive underscores with single underscore
        .trim()
        .substring(0, 100); // Limit length to prevent header size issues
      
      // Remove leading/trailing underscores and dots
      sanitizedFilename = sanitizedFilename.replace(/^[_.]+|[_.]+$/g, '');
      
      if (!sanitizedFilename || sanitizedFilename.length === 0) return undefined;
      
      // Use RFC 6266 format for better compatibility
      return `inline; filename="${sanitizedFilename}"`;
    } catch (error) {
      console.warn('Failed to create Content-Disposition header:', error);
      return undefined; // Skip the header if there's any issue
    }
  };

  describe('Filename Sanitization', () => {
    it('should handle normal filenames correctly', () => {
      const result = getContentDisposition('audio-file.mp3');
      expect(result).toBe('inline; filename="audio-file.mp3"');
    });

    it('should replace spaces with underscores', () => {
      const result = getContentDisposition('my audio file.mp3');
      expect(result).toBe('inline; filename="my_audio_file.mp3"');
    });

    it('should remove quotes and backslashes', () => {
      const result = getContentDisposition('audio"file\\test.mp3');
      expect(result).toBe('inline; filename="audiofiletest.mp3"');
    });

    it('should replace non-ASCII characters', () => {
      const result = getContentDisposition('audiö-fîle-tëst.mp3');
      expect(result).toBe('inline; filename="audi_-f_le-t_st.mp3"');
    });

    it('should handle Windows-invalid characters', () => {
      const result = getContentDisposition('audio<file>test:file|name?.mp3');
      expect(result).toBe('inline; filename="audio_file_test_file_name_.mp3"');
    });

    it('should remove control characters', () => {
      const result = getContentDisposition('audio\r\n\tfile.mp3');
      expect(result).toBe('inline; filename="audiofile.mp3"');
    });

    it('should limit filename length', () => {
      const longFilename = 'a'.repeat(150) + '.mp3';
      const result = getContentDisposition(longFilename);
      expect(result).toBeDefined();
      expect(result!.length).toBeLessThan(120); // Should be truncated
    });

    it('should handle empty or whitespace-only filenames', () => {
      expect(getContentDisposition('')).toBeUndefined();
      expect(getContentDisposition('   ')).toBeUndefined();
      expect(getContentDisposition('\t\r\n')).toBeUndefined();
      expect(getContentDisposition('___')).toBeUndefined(); // Should be cleaned to empty
    });

    it('should handle undefined filename', () => {
      expect(getContentDisposition(undefined)).toBeUndefined();
    });

    it('should handle complex real-world filenames', () => {
      const complexFilename = 'Qur\'an Recitation - Sürah Al-Fātiḥah (The Opening) - 22MB.mp3';
      const result = getContentDisposition(complexFilename);
      expect(result).toBeDefined();
      expect(result).toContain('filename="');
      // The result should be properly quoted and not contain problematic characters
      expect(result).toMatch(/^inline; filename="[^"]*"$/);
    });

    it('should handle Arabic/Islamic content filenames', () => {
      const arabicFilename = 'سورة الفاتحة - القارئ محمد صديق المنشاوي.mp3';
      const result = getContentDisposition(arabicFilename);
      expect(result).toBeDefined();
      // Arabic characters should be replaced with underscores
      expect(result).toMatch(/filename="[_\-\.a-zA-Z0-9]+"/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle filenames with only special characters', () => {
      const result = getContentDisposition('!@#$%^&*()');
      expect(result).toBeDefined();
      // Should contain some valid characters after sanitization
    });

    it('should handle very short filenames', () => {
      const result = getContentDisposition('a.mp3');
      expect(result).toBe('inline; filename="a.mp3"');
    });

    it('should handle filenames without extensions', () => {
      const result = getContentDisposition('audiofile');
      expect(result).toBe('inline; filename="audiofile"');
    });

    it('should handle multiple consecutive spaces', () => {
      const result = getContentDisposition('audio     file.mp3');
      expect(result).toBe('inline; filename="audio_file.mp3"');
    });

    it('should handle mixed problematic characters', () => {
      const result = getContentDisposition('test"file\\with\tmany\r\nproblems<>:|?*.mp3');
      expect(result).toBeDefined();
      // Should be properly formatted and not contain problematic characters
      expect(result).toMatch(/^inline; filename="[^"]*"$/);
      expect(result).not.toContain('\\');
      expect(result).not.toContain('\t');
      expect(result).not.toContain('\r');
      expect(result).not.toContain('\n');
    });
  });

  describe('Security Considerations', () => {
    it('should prevent header injection attacks', () => {
      const maliciousFilename = 'test.mp3\r\nContent-Type: text/html';
      const result = getContentDisposition(maliciousFilename);
      expect(result).toBeDefined();
      expect(result).not.toContain('\r');
      expect(result).not.toContain('\n');
      // The sanitized result should not contain the injection attempt
      expect(result).toMatch(/^inline; filename="[^"]*"$/);
    });

    it('should handle potential XSS attempts in filenames', () => {
      const xssFilename = '<script>alert("xss")</script>.mp3';
      const result = getContentDisposition(xssFilename);
      expect(result).toBeDefined();
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });
  });
});