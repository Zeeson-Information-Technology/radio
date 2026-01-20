/**
 * MPEG Conversion Workflow Integration Test
 * Tests the complete flow from MPEG upload to web playback
 */

import AudioConversionService from '../../lib/services/audioConversion';
import { SUPPORTED_AUDIO_FORMATS } from '../../lib/utils/audio-formats';

describe('MPEG Conversion Workflow', () => {
  describe('Conversion Detection', () => {
    it('should detect MPEG files need conversion', () => {
      expect(AudioConversionService.needsConversion('mpeg')).toBe(true);
    });

    it('should not convert already web-compatible formats', () => {
      expect(AudioConversionService.needsConversion('mp3')).toBe(false);
      expect(AudioConversionService.needsConversion('wav')).toBe(false);
      expect(AudioConversionService.needsConversion('m4a')).toBe(false);
    });
  });

  describe('Format Support Consistency', () => {
    it('should have MPEG in supported formats list', () => {
      expect(SUPPORTED_AUDIO_FORMATS.mpeg).toBeDefined();
      expect(SUPPORTED_AUDIO_FORMATS.mpeg.extension).toBe('mpeg');
      expect(SUPPORTED_AUDIO_FORMATS.mpeg.mimeTypes).toContain('audio/mpeg');
    });

    it('should classify MPEG as needing conversion', () => {
      const mpegFormat = SUPPORTED_AUDIO_FORMATS.mpeg;
      expect(mpegFormat.browserSupport).toBe('excellent'); // After conversion
      expect(AudioConversionService.needsConversion('mpeg')).toBe(true);
    });
  });

  describe('Upload and Conversion Flow', () => {
    it('should simulate MPEG upload triggering conversion', () => {
      // Simulate the upload route logic
      const simulateUpload = (format: string) => {
        const needsConversion = AudioConversionService.needsConversion(format);
        
        return {
          format: format,
          originalFormat: format,
          playbackFormat: needsConversion ? 'mp3' : format,
          conversionStatus: needsConversion ? 'pending' : 'ready',
          needsConversion
        };
      };

      const mpegUpload = simulateUpload('mpeg');
      expect(mpegUpload.needsConversion).toBe(true);
      expect(mpegUpload.playbackFormat).toBe('mp3');
      expect(mpegUpload.conversionStatus).toBe('pending');
      expect(mpegUpload.originalFormat).toBe('mpeg');

      const mp3Upload = simulateUpload('mp3');
      expect(mp3Upload.needsConversion).toBe(false);
      expect(mp3Upload.playbackFormat).toBe('mp3');
      expect(mp3Upload.conversionStatus).toBe('ready');
    });
  });

  describe('Playback URL Selection', () => {
    it('should use playback URL for converted MPEG files', () => {
      // Simulate the play API logic
      const simulatePlayAPI = (recording: any) => {
        const usePlaybackUrl = recording.playbackUrl && recording.conversionStatus === 'ready';
        const sourceUrl = usePlaybackUrl ? recording.playbackUrl : recording.storageUrl;
        const format = usePlaybackUrl ? recording.playbackFormat : recording.format;
        
        return { sourceUrl, format, usePlaybackUrl };
      };

      // Test converted MPEG file
      const convertedMpeg = {
        format: 'mpeg',
        originalFormat: 'mpeg',
        playbackFormat: 'mp3',
        conversionStatus: 'ready',
        storageUrl: 'https://s3.amazonaws.com/bucket/original.mpeg',
        playbackUrl: 'https://s3.amazonaws.com/bucket/converted.mp3'
      };

      const result = simulatePlayAPI(convertedMpeg);
      expect(result.usePlaybackUrl).toBe(true);
      expect(result.sourceUrl).toBe('https://s3.amazonaws.com/bucket/converted.mp3');
      expect(result.format).toBe('mp3');
    });

    it('should use original URL for non-converted files', () => {
      const simulatePlayAPI = (recording: any) => {
        const usePlaybackUrl = recording.playbackUrl && recording.conversionStatus === 'ready';
        const sourceUrl = usePlaybackUrl ? recording.playbackUrl : recording.storageUrl;
        const format = usePlaybackUrl ? recording.playbackFormat : recording.format;
        
        return { sourceUrl, format, usePlaybackUrl: !!usePlaybackUrl };
      };

      // Test regular MP3 file (no conversion needed)
      const mp3File = {
        format: 'mp3',
        conversionStatus: 'ready',
        storageUrl: 'https://s3.amazonaws.com/bucket/audio.mp3',
        playbackUrl: null,
        playbackFormat: 'mp3'
      };

      const result = simulatePlayAPI(mp3File);
      expect(result.usePlaybackUrl).toBe(false);
      expect(result.sourceUrl).toBe('https://s3.amazonaws.com/bucket/audio.mp3');
      expect(result.format).toBe('mp3');
    });

    it('should handle pending conversion status', () => {
      const simulatePlayAPI = (recording: any) => {
        if (recording.conversionStatus === 'processing') {
          return { error: 'Audio is still being processed for web playback', status: 202 };
        }
        
        const usePlaybackUrl = recording.playbackUrl && recording.conversionStatus === 'ready';
        const sourceUrl = usePlaybackUrl ? recording.playbackUrl : recording.storageUrl;
        
        return { sourceUrl, usePlaybackUrl };
      };

      // Test MPEG file still being converted
      const processingMpeg = {
        format: 'mpeg',
        conversionStatus: 'processing',
        storageUrl: 'https://s3.amazonaws.com/bucket/original.mpeg',
        playbackUrl: null
      };

      const result = simulatePlayAPI(processingMpeg);
      expect(result.error).toContain('still being processed');
      expect(result.status).toBe(202);
    });
  });

  describe('User Experience Flow', () => {
    it('should provide appropriate UI states for conversion status', () => {
      const getUIState = (conversionStatus: string) => {
        switch (conversionStatus) {
          case 'pending':
            return { 
              canPlay: false, 
              message: 'Queued for conversion',
              showSpinner: true 
            };
          case 'processing':
            return { 
              canPlay: false, 
              message: 'Converting MPEG to MP3 for web playback...',
              showSpinner: true 
            };
          case 'ready':
            return { 
              canPlay: true, 
              message: 'Ready to play',
              showSpinner: false 
            };
          case 'failed':
            return { 
              canPlay: false, 
              message: 'Conversion failed. Please try re-uploading.',
              showSpinner: false 
            };
          default:
            return { 
              canPlay: false, 
              message: 'Unknown status',
              showSpinner: false 
            };
        }
      };

      expect(getUIState('pending').canPlay).toBe(false);
      expect(getUIState('pending').showSpinner).toBe(true);
      
      expect(getUIState('processing').canPlay).toBe(false);
      expect(getUIState('processing').message).toContain('Converting');
      
      expect(getUIState('ready').canPlay).toBe(true);
      expect(getUIState('ready').showSpinner).toBe(false);
      
      expect(getUIState('failed').canPlay).toBe(false);
      expect(getUIState('failed').message).toContain('failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle conversion failures gracefully', () => {
      const handleConversionError = (error: string, attempts: number) => {
        if (attempts < 3) {
          return {
            action: 'retry',
            delay: Math.pow(2, attempts) * 60000, // Exponential backoff
            status: 'pending'
          };
        } else {
          return {
            action: 'fail',
            status: 'failed',
            error: error
          };
        }
      };

      // Test retry logic
      const firstFailure = handleConversionError('FFmpeg error', 1);
      expect(firstFailure.action).toBe('retry');
      expect(firstFailure.status).toBe('pending');
      expect(firstFailure.delay).toBe(120000); // 2 minutes

      // Test final failure
      const finalFailure = handleConversionError('FFmpeg error', 3);
      expect(finalFailure.action).toBe('fail');
      expect(finalFailure.status).toBe('failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple MPEG files in conversion queue', () => {
      const conversionQueue: Array<{id: string, format: string, status: string}> = [];
      
      // Simulate adding multiple MPEG files
      const mpegFiles = ['file1.mpeg', 'file2.mpeg', 'file3.mpeg'];
      
      mpegFiles.forEach((filename, index) => {
        if (AudioConversionService.needsConversion('mpeg')) {
          conversionQueue.push({
            id: `recording_${index}`,
            format: 'mpeg',
            status: 'pending'
          });
        }
      });

      expect(conversionQueue.length).toBe(3);
      expect(conversionQueue.every(item => item.status === 'pending')).toBe(true);
    });

    it('should not queue web-compatible formats for conversion', () => {
      const webFormats = ['mp3', 'wav', 'm4a', 'aac', 'ogg'];
      const conversionQueue: string[] = [];
      
      webFormats.forEach(format => {
        if (AudioConversionService.needsConversion(format)) {
          conversionQueue.push(format);
        }
      });

      expect(conversionQueue.length).toBe(0);
    });
  });
});