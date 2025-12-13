import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

export interface ConversionProgress {
  percentage: number;
  timeProcessed: number;
  totalTime: number;
  speed: string;
}

export class FFmpegService {
  private static instance: FFmpegService;
  private ffmpegPath: string = 'ffmpeg';
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'audio-conversion');
    this.ensureTempDir();
  }

  static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Validate that FFmpeg is installed and accessible
   */
  async validateFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn(this.ffmpegPath, ['-version']);
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });
      
      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Convert AMR file to MP3 optimized for voice
   */
  async convertToMp3(inputPath: string, outputPath: string): Promise<ConversionResult> {
    try {
      // Ensure temp directory exists
      await this.ensureTempDir();

      // Generate temporary file paths
      const tempInput = path.join(this.tempDir, `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      const tempOutput = path.join(this.tempDir, `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp3`);

      console.log('🎵 FFmpeg: Starting conversion', {
        inputPath,
        outputPath,
        tempInput,
        tempOutput
      });

      // Copy input file to temp location for processing
      await fs.copyFile(inputPath, tempInput);

      // FFmpeg arguments optimized for voice recordings
      const args = [
        '-i', tempInput,
        '-codec:a', 'libmp3lame',
        '-b:a', '64k',           // 64kbps bitrate for voice
        '-ar', '22050',          // 22.05kHz sample rate for voice
        '-ac', '1',              // Mono channel for voice
        '-f', 'mp3',             // Force MP3 format
        '-y',                    // Overwrite output file
        tempOutput
      ];

      const result = await this.runFFmpeg(args);

      if (result.success && tempOutput) {
        // Copy result to final destination
        await fs.copyFile(tempOutput, outputPath);
        
        // Get file stats
        const stats = await fs.stat(outputPath);
        
        // Clean up temp files
        await this.cleanupTempFiles([tempInput, tempOutput]);

        return {
          success: true,
          outputPath,
          fileSize: stats.size,
          duration: result.duration
        };
      } else {
        // Clean up temp files on failure
        await this.cleanupTempFiles([tempInput, tempOutput]);
        
        return {
          success: false,
          error: result.error || 'Unknown conversion error'
        };
      }

    } catch (error) {
      console.error('🎵 FFmpeg: Conversion error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run FFmpeg with given arguments
   */
  private async runFFmpeg(args: string[]): Promise<{ success: boolean; duration?: number; error?: string }> {
    return new Promise((resolve) => {
      console.log('🎵 FFmpeg: Running command', this.ffmpegPath, args.join(' '));
      
      const ffmpeg = spawn(this.ffmpegPath, args);
      let stderr = '';
      let duration: number | undefined;

      // Capture stderr for progress and error information
      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        // Extract duration from FFmpeg output
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('🎵 FFmpeg: Conversion successful');
          resolve({ success: true, duration });
        } else {
          console.error('🎵 FFmpeg: Conversion failed with code', code);
          console.error('🎵 FFmpeg: Error output:', stderr);
          resolve({ 
            success: false, 
            error: `FFmpeg exited with code ${code}: ${stderr.slice(-500)}` // Last 500 chars of error
          });
        }
      });

      ffmpeg.on('error', (error) => {
        console.error('🎵 FFmpeg: Process error', error);
        resolve({ 
          success: false, 
          error: `FFmpeg process error: ${error.message}` 
        });
      });

      // Set timeout for conversion (30 seconds)
      setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        resolve({ 
          success: false, 
          error: 'Conversion timeout after 30 seconds' 
        });
      }, 30000);
    });
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log('🎵 FFmpeg: Cleaned up temp file', filePath);
      } catch (error) {
        console.warn('🎵 FFmpeg: Failed to cleanup temp file', filePath, error);
      }
    }
  }

  /**
   * Get audio file information using FFprobe
   */
  async getAudioInfo(filePath: string): Promise<{ duration?: number; format?: string; bitrate?: number }> {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

      let stdout = '';
      
      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');
            
            resolve({
              duration: parseFloat(info.format?.duration) || undefined,
              format: audioStream?.codec_name || undefined,
              bitrate: parseInt(audioStream?.bit_rate) || undefined
            });
          } catch (error) {
            console.error('🎵 FFprobe: Failed to parse output', error);
            resolve({});
          }
        } else {
          console.error('🎵 FFprobe: Failed with code', code);
          resolve({});
        }
      });

      ffprobe.on('error', (error) => {
        console.error('🎵 FFprobe: Process error', error);
        resolve({});
      });
    });
  }
}

export default FFmpegService;