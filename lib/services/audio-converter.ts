/**
 * Audio Conversion Service for Al-Manhaj Radio
 * Converts unsupported audio formats (like AMR) to web-compatible formats (MP3)
 */

import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { getFormatByExtension } from '@/lib/utils/audio-formats';

export interface ConversionResult {
  success: boolean;
  convertedBuffer?: Buffer;
  originalFormat: string;
  targetFormat: string;
  duration?: number;
  error?: string;
}

/**
 * Check if a format needs conversion for web playback
 */
export function needsConversion(fileExtension: string): boolean {
  const formatInfo = getFormatByExtension(fileExtension);
  if (!formatInfo) return true;
  
  // Formats that need conversion due to poor browser support
  const needsConversionFormats = ['amr', 'amr-wb', '3gp', '3gp2', 'wma'];
  return needsConversionFormats.includes(formatInfo.extension);
}

/**
 * Get the target format for conversion
 */
export function getTargetFormat(originalFormat: string): string {
  // Convert everything to MP3 for maximum compatibility
  return 'mp3';
}

/**
 * Convert audio file to web-compatible format
 */
export async function convertAudioFile(
  fileBuffer: Buffer,
  originalFileName: string,
  originalFormat: string
): Promise<ConversionResult> {
  return new Promise((resolve) => {
    const targetFormat = getTargetFormat(originalFormat);
    
    console.log(`🔄 Converting ${originalFormat.toUpperCase()} to ${targetFormat.toUpperCase()}: ${originalFileName}`);
    
    try {
      const inputStream = new Readable();
      inputStream.push(fileBuffer);
      inputStream.push(null);
      
      const outputChunks: Buffer[] = [];
      let duration: number | undefined;
      
      const command = ffmpeg(inputStream)
        .inputFormat(originalFormat === 'amr' ? 'amr' : originalFormat)
        .audioCodec('libmp3lame')
        .audioBitrate('96k') // Good quality for speech
        .audioFrequency(22050) // Sufficient for voice content
        .format('mp3')
        .on('codecData', (data) => {
          // Extract duration if available
          if (data.duration) {
            const durationParts = data.duration.split(':');
            if (durationParts.length === 3) {
              const hours = parseInt(durationParts[0]);
              const minutes = parseInt(durationParts[1]);
              const seconds = parseFloat(durationParts[2]);
              duration = hours * 3600 + minutes * 60 + seconds;
            }
          }
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg conversion error:', err.message);
          resolve({
            success: false,
            originalFormat,
            targetFormat,
            error: `Conversion failed: ${err.message}`
          });
        })
        .on('end', () => {
          console.log('✅ Audio conversion completed successfully');
          const convertedBuffer = Buffer.concat(outputChunks);
          resolve({
            success: true,
            convertedBuffer,
            originalFormat,
            targetFormat,
            duration
          });
        });
      
      // Collect output data
      command.pipe().on('data', (chunk) => {
        outputChunks.push(chunk);
      });
      
    } catch (error) {
      console.error('❌ Audio conversion setup error:', error);
      resolve({
        success: false,
        originalFormat,
        targetFormat,
        error: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
}

/**
 * Get converted file name
 */
export function getConvertedFileName(originalFileName: string, targetFormat: string): string {
  const nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '');
  return `${nameWithoutExt}_converted.${targetFormat}`;
}

/**
 * Estimate conversion time (for progress indication)
 */
export function estimateConversionTime(fileSizeBytes: number, originalFormat: string): number {
  // Rough estimates in seconds based on file size and format complexity
  const baseFactor = fileSizeBytes / (1024 * 1024); // MB
  
  switch (originalFormat.toLowerCase()) {
    case 'amr':
    case 'amr-wb':
      return Math.max(5, baseFactor * 2); // AMR is usually small but slow to decode
    case '3gp':
    case '3gp2':
      return Math.max(3, baseFactor * 1.5);
    case 'wma':
      return Math.max(4, baseFactor * 1.8);
    default:
      return Math.max(2, baseFactor * 1.2);
  }
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpegAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.warn('⚠️ FFmpeg not available:', err.message);
        resolve(false);
      } else {
        console.log('✅ FFmpeg is available');
        resolve(true);
      }
    });
  });
}