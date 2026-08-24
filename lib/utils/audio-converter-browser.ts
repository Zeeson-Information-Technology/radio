/**
 * Browser-side audio conversion using FFmpeg.wasm
 * Converts AMR, 3GP, WMA to MP3 for browser playback
 * 
 * Note: First load is slow (~20-30s) as it downloads FFmpeg binary
 * Subsequent conversions are fast
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
 */
export async function initFFmpeg() {
  if (ffmpegLoaded) return;

  try {
    const { FFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg');
    const fmpeg = new FFmpeg();

    // Set up logging (optional)
    fmpeg.on('log', ({ message }: any) => {
      console.log('[FFmpeg]', message);
    });

    await fmpeg.load();
    ffmpegInstance = { FFmpeg: fmpeg, fetchFile };
    ffmpegLoaded = true;
    console.log('✅ FFmpeg loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load FFmpeg:', error);
    throw new Error('Audio conversion library failed to load');
  }
}

/**
 * Convert audio file to MP3
 * @param file - Input audio file (AMR, 3GP, WMA, WAV, etc.)
 * @param onProgress - Progress callback (0-100)
 * @returns Converted MP3 file
 */
export async function convertAudioToMP3(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  if (!ffmpegLoaded || !ffmpegInstance) {
    throw new Error('FFmpeg not initialized. Call initFFmpeg() first.');
  }

  const { FFmpeg: fmpeg, fetchFile } = ffmpegInstance;
  const inputName = file.name;
  const outputName = `${inputName.split('.')[0]}.mp3`;

  try {
    onProgress?.(10);
    console.log(`🎵 Converting ${inputName} to MP3...`);

    // Write file to FFmpeg filesystem
    const data = await fetchFile(file);
    fmpeg.FS('writeFile', inputName, data);
    onProgress?.(30);

    // Run conversion command
    // -i: input file
    // -q:a 5: quality (1-9, lower=better), 5 is good balance
    // -codec:a: audio codec (libmp3lame for MP3)
    await fmpeg.run(
      '-i',
      inputName,
      '-q:a',
      '5',
      '-codec:a',
      'libmp3lame',
      outputName
    );
    onProgress?.(70);

    // Read converted file from FFmpeg filesystem
    const convertedData = fmpeg.FS('readFile', outputName);
    onProgress?.(90);

    // Create new File object
    const convertedFile = new File([convertedData], outputName, {
      type: 'audio/mpeg',
    });

    // Clean up FFmpeg filesystem
    fmpeg.FS('unlink', inputName);
    fmpeg.FS('unlink', outputName);

    onProgress?.(100);
    console.log(`✅ Conversion complete: ${inputName} → ${outputName}`);

    return convertedFile;
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    throw new Error(`Failed to convert audio: ${error}`);
  }
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
