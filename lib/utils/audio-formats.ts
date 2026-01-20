/**
 * Audio Format Utilities for Al-Manhaj Radio
 * Comprehensive support for various audio formats commonly used in Islamic content
 */

export interface AudioFormatInfo {
  extension: string;
  mimeTypes: string[];
  description: string;
  quality: 'lossy' | 'lossless' | 'variable';
  commonUse: string;
  browserSupport: 'excellent' | 'good' | 'limited' | 'poor';
}

export const SUPPORTED_AUDIO_FORMATS: Record<string, AudioFormatInfo> = {
  mp3: {
    extension: 'mp3',
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/x-mp3'],
    description: 'MPEG Audio Layer III',
    quality: 'lossy',
    commonUse: 'Most common format for lectures and recitations',
    browserSupport: 'excellent'
  },
  
  mpeg: {
    extension: 'mpeg',
    mimeTypes: ['audio/mpeg', 'audio/x-mpeg'],
    description: 'MPEG Audio',
    quality: 'lossy',
    commonUse: 'MPEG audio files (same as MP3)',
    browserSupport: 'excellent'
  },
  
  wav: {
    extension: 'wav',
    mimeTypes: ['audio/wav', 'audio/x-wav', 'audio/wave'],
    description: 'Waveform Audio File Format',
    quality: 'lossless',
    commonUse: 'High-quality recordings, studio masters',
    browserSupport: 'excellent'
  },
  
  m4a: {
    extension: 'm4a',
    mimeTypes: ['audio/mp4', 'audio/m4a', 'audio/mp4a-latm'],
    description: 'MPEG-4 Audio',
    quality: 'lossy',
    commonUse: 'Apple devices, high-quality compressed audio',
    browserSupport: 'excellent'
  },
  
  aac: {
    extension: 'aac',
    mimeTypes: ['audio/aac', 'audio/x-aac', 'audio/mp4'],
    description: 'Advanced Audio Coding',
    quality: 'lossy',
    commonUse: 'High-quality compressed audio, streaming',
    browserSupport: 'good'
  },
  
  ogg: {
    extension: 'ogg',
    mimeTypes: ['audio/ogg', 'audio/oga', 'application/ogg'],
    description: 'Ogg Vorbis',
    quality: 'lossy',
    commonUse: 'Open-source alternative to MP3',
    browserSupport: 'good'
  },
  
  flac: {
    extension: 'flac',
    mimeTypes: ['audio/flac', 'audio/x-flac'],
    description: 'Free Lossless Audio Codec',
    quality: 'lossless',
    commonUse: 'Archival quality, audiophile recordings',
    browserSupport: 'good'
  },
  
  amr: {
    extension: 'amr',
    mimeTypes: ['audio/amr', 'audio/amr-nb', 'audio/x-amr', 'application/octet-stream'],
    description: 'Adaptive Multi-Rate',
    quality: 'lossy',
    commonUse: 'Voice recordings, phone calls, lectures',
    browserSupport: 'limited'
  },
  
  'amr-wb': {
    extension: 'amr-wb',
    mimeTypes: ['audio/amr-wb', 'audio/amr-wideband', 'audio/x-amr-wb', 'application/octet-stream'],
    description: 'AMR Wideband',
    quality: 'lossy',
    commonUse: 'Higher quality voice recordings',
    browserSupport: 'limited'
  },
  
  webm: {
    extension: 'webm',
    mimeTypes: ['audio/webm'],
    description: 'WebM Audio',
    quality: 'lossy',
    commonUse: 'Modern web streaming, Google services',
    browserSupport: 'good'
  },
  
  wma: {
    extension: 'wma',
    mimeTypes: ['audio/x-ms-wma', 'audio/wma'],
    description: 'Windows Media Audio',
    quality: 'lossy',
    commonUse: 'Windows ecosystem, older recordings',
    browserSupport: 'poor'
  },
  
  '3gp': {
    extension: '3gp',
    mimeTypes: ['audio/3gpp', 'audio/3gp'],
    description: '3GPP Audio',
    quality: 'lossy',
    commonUse: 'Mobile phone recordings, WhatsApp voice notes',
    browserSupport: 'limited'
  },
  
  '3gp2': {
    extension: '3gp2',
    mimeTypes: ['audio/3gpp2', 'audio/3g2'],
    description: '3GPP2 Audio',
    quality: 'lossy',
    commonUse: 'CDMA mobile recordings',
    browserSupport: 'limited'
  }
};

/**
 * Get all supported MIME types
 */
export function getSupportedMimeTypes(): string[] {
  const mimeTypes: string[] = [];
  Object.values(SUPPORTED_AUDIO_FORMATS).forEach(format => {
    mimeTypes.push(...format.mimeTypes);
  });
  return [...new Set(mimeTypes)]; // Remove duplicates
}

/**
 * Get format info by file extension
 */
export function getFormatByExtension(extension: string): AudioFormatInfo | null {
  if (!extension || typeof extension !== 'string') {
    return null;
  }
  const normalizedExt = extension.toLowerCase().replace('.', '');
  return SUPPORTED_AUDIO_FORMATS[normalizedExt] || null;
}

/**
 * Get format info by MIME type
 */
export function getFormatByMimeType(mimeType: string): AudioFormatInfo | null {
  if (!mimeType || typeof mimeType !== 'string') {
    return null;
  }
  for (const format of Object.values(SUPPORTED_AUDIO_FORMATS)) {
    if (format.mimeTypes.includes(mimeType.toLowerCase())) {
      return format;
    }
  }
  return null;
}

/**
 * Validate if a file type is supported
 */
export function isAudioFormatSupported(mimeType: string): boolean {
  return getSupportedMimeTypes().includes(mimeType.toLowerCase());
}

/**
 * Get user-friendly format description
 */
export function getFormatDescription(extension: string): string {
  const format = getFormatByExtension(extension);
  if (!format) return extension.toUpperCase();
  
  return `${extension.toUpperCase()} (${format.description})`;
}

/**
 * Get recommended formats for different use cases
 */
export const RECOMMENDED_FORMATS = {
  lectures: ['mp3', 'm4a', 'aac'],
  quranRecitation: ['flac', 'wav', 'm4a', 'mp3'],
  voiceRecordings: ['amr', 'amr-wb', '3gp', 'mp3'],
  archival: ['flac', 'wav'],
  streaming: ['mp3', 'm4a', 'webm', 'aac'],
  mobile: ['mp3', 'm4a', '3gp', 'amr']
};

/**
 * Get format recommendations based on content type
 */
export function getRecommendedFormats(contentType: 'lecture' | 'quran' | 'voice' | 'archival' | 'streaming' | 'mobile'): string[] {
  switch (contentType) {
    case 'lecture': return RECOMMENDED_FORMATS.lectures;
    case 'quran': return RECOMMENDED_FORMATS.quranRecitation;
    case 'voice': return RECOMMENDED_FORMATS.voiceRecordings;
    case 'archival': return RECOMMENDED_FORMATS.archival;
    case 'streaming': return RECOMMENDED_FORMATS.streaming;
    case 'mobile': return RECOMMENDED_FORMATS.mobile;
    default: return RECOMMENDED_FORMATS.lectures;
  }
}

/**
 * Browser compatibility check
 */
export function getBrowserCompatibility(extension: string): {
  canPlay: boolean;
  needsConversion: boolean;
  recommendedAlternative?: string;
} {
  const format = getFormatByExtension(extension);
  if (!format) {
    return { canPlay: false, needsConversion: true, recommendedAlternative: 'mp3' };
  }
  
  switch (format.browserSupport) {
    case 'excellent':
      return { canPlay: true, needsConversion: false };
    case 'good':
      return { canPlay: true, needsConversion: false };
    case 'limited':
      return { canPlay: false, needsConversion: true, recommendedAlternative: 'mp3' };
    case 'poor':
      return { canPlay: false, needsConversion: true, recommendedAlternative: 'mp3' };
    default:
      return { canPlay: false, needsConversion: true, recommendedAlternative: 'mp3' };
  }
}

/**
 * Calculate estimated file size for audio content
 */
export function estimateFileSize(durationMinutes: number, format: string, bitrate: number): {
  sizeBytes: number;
  sizeMB: number;
  withinLimit: boolean;
  recommendation?: string;
} {
  const maxSizeBytes = 30 * 1024 * 1024; // 30MB limit
  
  // Calculate size: (bitrate in kbps * duration in seconds) / 8 bits per byte
  const sizeBytes = (bitrate * durationMinutes * 60) / 8 * 1024;
  const sizeMB = sizeBytes / (1024 * 1024);
  const withinLimit = sizeBytes <= maxSizeBytes;
  
  let recommendation: string | undefined;
  if (!withinLimit) {
    if (durationMinutes <= 20) {
      recommendation = "Try MP3 96kbps or M4A 64kbps for lectures under 20 minutes";
    } else {
      recommendation = "For longer content, use MP3 64kbps or split into multiple parts";
    }
  }
  
  return {
    sizeBytes,
    sizeMB: Math.round(sizeMB * 10) / 10,
    withinLimit,
    recommendation
  };
}

/**
 * Get optimal compression settings for content type
 */
export function getOptimalSettings(contentType: 'lecture' | 'quran' | 'voice', durationMinutes: number): {
  format: string;
  bitrate: number;
  estimatedSize: number;
  description: string;
} {
  switch (contentType) {
    case 'lecture':
      if (durationMinutes <= 20) {
        return {
          format: 'mp3',
          bitrate: 96,
          estimatedSize: estimateFileSize(durationMinutes, 'mp3', 96).sizeMB,
          description: 'Good quality for speech content'
        };
      } else {
        return {
          format: 'mp3',
          bitrate: 64,
          estimatedSize: estimateFileSize(durationMinutes, 'mp3', 64).sizeMB,
          description: 'Optimized for longer lectures'
        };
      }
    
    case 'quran':
      return {
        format: 'm4a',
        bitrate: 96,
        estimatedSize: estimateFileSize(durationMinutes, 'm4a', 96).sizeMB,
        description: 'High quality for Quran recitation'
      };
    
    case 'voice':
      return {
        format: 'amr',
        bitrate: 12.2,
        estimatedSize: estimateFileSize(durationMinutes, 'amr', 12.2).sizeMB,
        description: 'Optimized for voice recordings'
      };
    
    default:
      return {
        format: 'mp3',
        bitrate: 128,
        estimatedSize: estimateFileSize(durationMinutes, 'mp3', 128).sizeMB,
        description: 'Standard quality'
      };
  }
}