"use client";

import { useState, useRef, useEffect } from "react";

interface AMRAudioPlayerProps {
  audioUrl: string;
  title: string;
  format: string;
  onEnded: () => void;
  onError: (error: string) => void;
}

export default function AMRAudioPlayer({ audioUrl, title, format, onEnded, onError }: AMRAudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if format needs special handling
  const needsSpecialHandling = ['amr', 'amr-wb', '3gp', '3gp2'].includes(format.toLowerCase());

  useEffect(() => {
    if (needsSpecialHandling) {
      // For AMR files, show helpful message instead of trying to play
      setIsLoading(false);
      setTimeout(() => {
        onError(`${format.toUpperCase()} files cannot be played directly in browsers. Please convert to MP3 or M4A format for web playback.`);
      }, 1000);
    } else {
      // Handle standard audio files
      const audio = audioRef.current;
      if (!audio) return;

      const handleLoadedMetadata = () => {
        setIsLoading(false);
      };

      const handleError = () => {
        setIsLoading(false);
        onError("Audio file format not supported by browser");
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [audioUrl, format, needsSpecialHandling, onError]);

  const handleDownload = () => {
    // Create a download link for the AMR file
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${title}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (needsSpecialHandling) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-4">
          {/* Info Icon */}
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          </div>

          {/* Message and Actions */}
          <div className="flex-1">
            <h4 className="font-medium text-amber-900 mb-1">{title}</h4>
            <p className="text-sm text-amber-800 mb-3">
              {format.toUpperCase()} files cannot be played in web browsers. This format is commonly used for voice recordings from mobile devices.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
              >
                📥 Download File
              </button>
              
              <div className="text-xs text-amber-700 flex items-center">
                💡 Tip: Convert to MP3 using online tools or mobile apps for web playback
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For non-AMR files, show loading state
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full">
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">{title}</h4>
          <p className="text-sm text-blue-700">
            {isLoading ? "Loading audio..." : "Audio format not supported"}
          </p>
        </div>
      </div>
      
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
        controls={false}
        style={{ display: 'none' }}
      >
        <source src={audioUrl} />
      </audio>
    </div>
  );
}