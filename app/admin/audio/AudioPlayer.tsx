"use client";

import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  onEnded: () => void;
  onError: (error: string) => void;
}

export default function AudioPlayer({ audioUrl, title, onEnded, onError }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Check format compatibility
    if (audioUrl) {
      console.log("🎵 Audio Player - Loading URL:", audioUrl);
      
      // Try to detect format from URL
      const urlLower = audioUrl.toLowerCase();
      let detectedFormat = "unknown";
      
      if (urlLower.includes('.mp3') || urlLower.includes('audio/mpeg')) {
        detectedFormat = "MP3";
      } else if (urlLower.includes('.m4a') || urlLower.includes('audio/mp4')) {
        detectedFormat = "M4A";
      } else if (urlLower.includes('.wav') || urlLower.includes('audio/wav')) {
        detectedFormat = "WAV";
      } else if (urlLower.includes('.amr')) {
        detectedFormat = "AMR";
      } else if (urlLower.includes('.flac')) {
        detectedFormat = "FLAC";
      }
      
      console.log("🎵 Detected format:", detectedFormat);
      
      // Check browser support
      const canPlayMp3 = audio.canPlayType('audio/mpeg');
      const canPlayM4a = audio.canPlayType('audio/mp4');
      const canPlayWav = audio.canPlayType('audio/wav');
      const canPlayAmr = audio.canPlayType('audio/amr');
      const canPlayFlac = audio.canPlayType('audio/flac');
      
      console.log("🎵 Browser format support:", {
        MP3: canPlayMp3,
        M4A: canPlayM4a,
        WAV: canPlayWav,
        AMR: canPlayAmr,
        FLAC: canPlayFlac
      });
      
      // Warn if format might not be supported
      if (detectedFormat === "AMR" && !canPlayAmr) {
        console.warn("⚠️ AMR format may not be supported by this browser");
      }
    }

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
      onEnded();
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
            errorMessage = "Audio file format not supported or corrupted. Try converting to MP3 or M4A format.";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            // Check if it's an AMR file
            if (audioElement.src.toLowerCase().includes('.amr')) {
              errorMessage = "AMR format is not supported by most browsers. Please convert to MP3 or M4A format for web playback.";
            } else {
              errorMessage = "Audio file format not supported by browser. Supported formats: MP3, M4A, WAV.";
            }
            break;
          default:
            errorMessage = "Unknown audio loading error";
        }
      }
      
      console.error("🎵 Audio Player Error:", {
        errorCode: audioElement.error?.code,
        errorMessage,
        audioSrc: audioElement.src
      });
      
      onError(errorMessage);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
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
  }, [audioUrl, onEnded, onError]);

  const togglePlayPause = async () => {
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
    } catch (error) {
      console.error("🎵 Play Error:", error);
      let errorMessage = "Failed to play audio";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage = "Audio playback blocked by browser. Please interact with the page first.";
        } else if (error.name === "NotSupportedError") {
          errorMessage = "Audio format not supported by your browser";
        } else if (error.name === "AbortError") {
          errorMessage = "Audio playback was interrupted";
        }
      }
      
      onError(errorMessage);
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

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
        controls={false}
      >
        <source src={audioUrl} />
        Your browser does not support the audio element.
      </audio>
      
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Track Info and Controls */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-900 truncate">{title}</h4>
            <span className="text-sm text-blue-700">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(currentTime / duration) * 100}%, #bfdbfe ${(currentTime / duration) * 100}%, #bfdbfe 100%)`
              }}
            />
            
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}