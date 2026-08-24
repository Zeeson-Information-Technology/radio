/**
 * Browser-side audio conversion using FFmpeg.wasm
 * Converts AMR, 3GP, WMA to MP3 for browser playback
 * 
 * Note: First load is slow (~20-30s) as it downloads FFmpeg binary
 * Subsequent conversions are fast
 * 
 * DISABLED: Conversion now happens server-side on the gateway
 */

declare global {
  interface Window {
    FFmpeg?: any;
  }
}

let ffmpegInstance: any = null;
let ffmpegLoaded = false;

/**
 * Load FFmpeg library (only once)
 * DISABLED - conversion happens server-side
 */
export async function initFFmpeg() {
  if (ffmpegLoaded) return;

  try {
    // Server-side conversion is used instead
    // Browser-side FFmpeg is disabled to reduce bundle size
    ffmpegLoaded = true;
    console.log('ℹ️ FFmpeg: Using server-side conversion via gateway');
  } catch (error) {
    console.error('❌ Failed to initialize conversion:', error);
    throw new Error('Audio conversion is handled server-side');
  }
}

/**
 * Convert audio file to MP3
 * DISABLED - conversion happens server-side on the gateway
 * @param file - Input audio file (AMR, 3GP, WMA, WAV, etc.)
 * @param onProgress - Progress callback (0-100)
 * @returns Converted MP3 file
 */
export async function convertAudioToMP3(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  // Server-side conversion is used instead
  throw new Error('Browser-side conversion is disabled. Conversion happens server-side on the gateway.');
}

/**
 * Check if format needs conversion for browser playback
 */
export function needsBrowserConversion(format: string): boolean {
  const needsConversion = ['amr', 'amr-wb', '3gp', '3gp2', 'wma', 'mpeg'];
  return needsConversion.includes(format.toLowerCase());
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}
