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

// Supported playable formats
const PLAYABLE_FORMATS = new Set([
  'mp3', 'mpeg', 'mpeg-3',
  'm4a', 'aac',
  'wav',
  'ogg', 'oga',
  'flac',
  'webm'
]);

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

  // Simple, fast format check
  const canPlayFormat = (fmt: string): boolean => {
    if (!fmt) return false;
    const normalized = fmt.toLowerCase().trim();
    return PLAYABLE_FORMATS.has(normalized);
  };

  // Handle conversion status
  if (conversionStatus === 'processing') {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex-shrink-0">
            <div className="w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-yellow-900 truncate">{title}</h4>
            <p className="text-sm text-yellow-800 mt-1">Converting {originalFormat?.toUpperCase() || format.toUpperCase()} to MP3...</p>
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
            <span>❌</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-red-900 truncate">{title}</h4>
            <p className="text-sm text-red-800 mt-1">Conversion to MP3 failed. Please re-upload the file.</p>
          </div>
        </div>
      </div>
    );
  }

  // Reset on URL change
  useEffect(() => {
    setIsLoading(true);
    setError("");
    setIsPlaying(false);
  }, [audioUrl]);

  // Setup audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !canPlayFormat(format)) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleError = (e: Event) => {
      setIsLoading(false);
      const target = e.target as HTMLAudioElement;
      const msg = `Failed to load ${format.toUpperCase()} file`;
      setError(msg);
      onError?.(msg);
    };

    const handleCanPlay = async () => {
      setIsLoading(false);
      if (autoPlay) {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn("Auto-play blocked");
        }
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, format, autoPlay, onEnded, onError]);

  // Check if format is playable
  if (!canPlayFormat(format)) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex-shrink-0">
            <span>🎵</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-amber-900 truncate">{title}</h4>
            <p className="text-sm text-amber-800 mt-1">
              {format.toUpperCase()} format not supported. Use MP3, M4A, or WAV.
            </p>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = audioUrl;
                link.download = `${title}.${format}`;
                link.click();
              }}
              className="mt-2 px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              Download File
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playable format - render player
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            const audio = audioRef.current;
            if (!audio) return;
            try {
              if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
              } else {
                await audio.play();
                setIsPlaying(true);
              }
            } catch (err) {
              console.error("Play error:", err);
            }
          }}
          disabled={isLoading || !!error}
          className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
        >
          {isLoading ? <span>⏳</span> : isPlaying ? <span>⏸</span> : <span>▶</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-blue-900 truncate">{title}</h4>
            <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded flex-shrink-0">
              {format.toUpperCase()}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => {
              const audio = audioRef.current;
              if (audio) {
                audio.currentTime = parseFloat(e.target.value);
              }
            }}
            disabled={isLoading || !!error}
            className="w-full h-1.5 bg-blue-200 rounded cursor-pointer"
          />
        </div>

        <div className="hidden md:flex items-center gap-1">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => {
              const audio = audioRef.current;
              const val = parseFloat(e.target.value);
              if (audio) audio.volume = val;
              setVolume(val);
            }}
            className="w-12 h-1.5 bg-blue-200 rounded cursor-pointer"
          />
        </div>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-800 text-xs rounded">
          {error}
        </div>
      )}
    </div>
  );
}

// Export for diagnostics
console.log('✅ UniversalAudioPlayer loaded');