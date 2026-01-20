"use client";

import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  format: string;
  conversionStatus?: 'pending' | 'processing' | 'ready' | 'failed';
  originalFormat?: string;
  onEnded?: () => void;
  onError?: (error: string) => void;
  className?: string;
  autoPlay?: boolean;
}

interface FormatInfo {
  canPlay: boolean;
  browserSupport: 'excellent' | 'good' | 'limited' | 'none';
  recommendation?: string;
  conversionTip?: string;
}

export default function UniversalAudioPlayer({ 
  audioUrl, 
  title, 
  format, 
  conversionStatus = 'ready',
  originalFormat,
  onEnded, 
  onError,
  className = "",
  autoPlay = false
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format compatibility detection
  const getFormatInfo = (format: string): FormatInfo => {
    const normalizedFormat = format.toLowerCase();
    
    switch (normalizedFormat) {
      case 'mp3':
        return {
          canPlay: true,
          browserSupport: 'excellent',
        };
      case 'm4a':
      case 'aac':
        return {
          canPlay: true,
          browserSupport: 'excellent',
        };
      case 'wav':
        return {
          canPlay: true,
          browserSupport: 'excellent',
        };
      case 'ogg':
      case 'oga':
        return {
          canPlay: true,
          browserSupport: 'good',
        };
      case 'flac':
        return {
          canPlay: true,
          browserSupport: 'good',
        };
      case 'webm':
        return {
          canPlay: true,
          browserSupport: 'good',
        };
      case 'mpeg':
        return {
          canPlay: true,
          browserSupport: 'excellent',
          recommendation: 'MPEG files are automatically converted to MP3 for web playback'
        };
      case 'amr':
      case 'amr-nb':
      case 'amr-wb':
        return {
          canPlay: false,
          browserSupport: 'none',
          recommendation: 'Convert to MP3 64kbps for voice recordings',
          conversionTip: 'AMR is optimized for voice. Use online converters like CloudConvert or VLC Media Player.'
        };
      case '3gp':
      case '3gp2':
        return {
          canPlay: false,
          browserSupport: 'none',
          recommendation: 'Convert to MP3 or M4A for web playback',
          conversionTip: '3GP files from mobile devices work best when converted to MP3.'
        };
      case 'wma':
        return {
          canPlay: false,
          browserSupport: 'none',
          recommendation: 'Convert to MP3 or M4A for web compatibility',
          conversionTip: 'WMA is a Windows format. Use VLC or online converters to convert to MP3.'
        };
      default:
        return {
          canPlay: false,
          browserSupport: 'none',
          recommendation: 'Convert to MP3, M4A, or WAV for web playback',
          conversionTip: 'Use online audio converters or VLC Media Player for format conversion.'
        };
    }
  };

  const formatInfo = getFormatInfo(format);

  // Handle conversion status
  if (conversionStatus === 'processing') {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex-shrink-0">
            <div className="w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-yellow-900 truncate">{title}</h4>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-200 text-yellow-800">
                {originalFormat?.toUpperCase() || format.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-yellow-800 mb-3">
              Converting {originalFormat?.toUpperCase() || format.toUpperCase()} to MP3 for web playback...
            </p>
            <div className="text-xs text-yellow-700">
              This usually takes 10-30 seconds. The page will update automatically when ready.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (conversionStatus === 'failed') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 text-red-600 rounded-full flex-shrink-0">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-red-900 truncate">{title}</h4>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-200 text-red-800">
                {originalFormat?.toUpperCase() || format.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-red-800 mb-3">
              Conversion to MP3 failed. The original file may be corrupted or in an unsupported format.
            </p>
            <div className="text-xs text-red-700">
              Please try re-uploading the file or convert it manually to MP3 format.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset player state when audioUrl changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setError("");
  }, [audioUrl]);

  useEffect(() => {
    if (!formatInfo.canPlay) {
      setIsLoading(false);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Stop any currently playing audio and reset
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleError = (e: Event) => {
      setIsLoading(false);
      const audioElement = e.target as HTMLAudioElement;
      let errorMessage = "Failed to load audio file";
      
      if (audioElement.error) {
        switch (audioElement.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Audio loading was aborted";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Network error while loading audio";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = `Audio file format (${format.toUpperCase()}) not supported or corrupted. Try converting to MP3 or M4A format.`;
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = `${format.toUpperCase()} format is not supported by your browser. Please convert to MP3, M4A, or WAV format.`;
            break;
          default:
            errorMessage = `Unknown error loading ${format.toUpperCase()} file`;
        }
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
    };

    const handleCanPlay = async () => {
      setIsLoading(false);
      
      // Auto-play if requested and format is supported
      if (autoPlay && formatInfo.canPlay && audio) {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("🎵 Auto-play failed:", error);
          // Auto-play failed (likely due to browser policy), but don't show error
          // User can still manually click play
        }
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      // Clean up event listeners
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      
      // Stop and reset audio when cleaning up
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audioUrl, format, formatInfo.canPlay, onEnded, onError]);

  // Cleanup effect when component unmounts or audioUrl changes
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audioUrl]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !formatInfo.canPlay) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("🎵 Play Error:", error);
      let errorMessage = "Failed to play audio";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage = "Audio playback blocked by browser. Please interact with the page first.";
        } else if (error.name === "NotSupportedError") {
          errorMessage = `${format.toUpperCase()} format not supported by your browser`;
        } else if (error.name === "AbortError") {
          errorMessage = "Audio playback was interrupted";
        }
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${title}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getFormatIcon = (format: string): string => {
    const normalizedFormat = format.toLowerCase();
    switch (normalizedFormat) {
      case 'mp3': return '🎵';
      case 'm4a': case 'aac': return '🎶';
      case 'wav': return '🔊';
      case 'flac': return '💿';
      case 'ogg': case 'oga': return '🎧';
      case 'amr': case 'amr-wb': return '📱';
      case '3gp': case '3gp2': return '📞';
      case 'wma': return '🪟';
      default: return '🎵';
    }
  };

  const getBrowserSupportColor = (support: string): string => {
    switch (support) {
      case 'excellent': return 'text-emerald-600';
      case 'good': return 'text-blue-600';
      case 'limited': return 'text-yellow-600';
      case 'none': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  // Render unsupported format UI
  if (!formatInfo.canPlay) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-4">
          {/* Format Icon */}
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex-shrink-0">
            <span className="text-2xl">{getFormatIcon(format)}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-amber-900 truncate">{title}</h4>
              <span className={`text-xs font-medium px-2 py-1 rounded-full bg-amber-200 text-amber-800`}>
                {format.toUpperCase()}
              </span>
            </div>
            
            <p className="text-sm text-amber-800 mb-3">
              {format.toUpperCase()} files cannot be played directly in web browsers. 
              {formatInfo.conversionTip && (
                <span className="block mt-1 text-xs text-amber-700">
                  {formatInfo.conversionTip}
                </span>
              )}
            </p>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
              >
                📥 Download File
              </button>
              
              {formatInfo.recommendation && (
                <div className="flex items-center px-3 py-2 bg-amber-100 text-amber-800 text-xs rounded-lg">
                  💡 {formatInfo.recommendation}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render playable format UI
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 ${className}`}>
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        crossOrigin="anonymous"
        controls={false}
      >
        Your browser does not support the audio element.
      </audio>
      
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Play/Pause Button - Smaller */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading || !!error}
          className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isLoading ? (
            <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : error ? (
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          ) : isPlaying ? (
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Track Info and Controls - Compact */}
        <div className="flex-1 min-w-0">
          {/* Title and Format */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-xs sm:text-sm text-blue-900 truncate flex-1">{title}</h4>
            <span className={`text-xs font-medium px-1 py-0.5 rounded ${getBrowserSupportColor(formatInfo.browserSupport)} bg-blue-100 flex-shrink-0`}>
              {format.toUpperCase()}
            </span>
          </div>

          {/* Progress Bar - Compact */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              disabled={isLoading || !!error}
              className="flex-1 h-1.5 sm:h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(currentTime / (duration || 1)) * 100}%, #bfdbfe ${(currentTime / (duration || 1)) * 100}%, #bfdbfe 100%)`
              }}
            />
            
            {/* Volume Control - Smaller, desktop only */}
            <div className="hidden md:flex items-center gap-1">
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                disabled={isLoading || !!error}
                className="w-12 h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${volume * 100}%, #bfdbfe ${volume * 100}%, #bfdbfe 100%)`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={handleDownload}
            className="text-xs text-red-600 hover:text-red-700 underline mt-1"
          >
            Download file instead
          </button>
        </div>
      )}
    </div>
  );
}