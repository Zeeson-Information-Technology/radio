"use client";

import { useState, useEffect } from "react";
import UniversalAudioPlayer from "../components/UniversalAudioPlayer";

interface AudioRecording {
  _id: string;
  title: string;
  description?: string;
  lecturerName: string;
  type: "quran" | "hadith" | "tafsir" | "lecture" | "dua";
  tags: string[];
  year?: number;
  duration: number;
  format: string;
  uploadDate: string;
  playCount: number;
  category: {
    name: string;
    arabicName?: string;
    icon: string;
    color: string;
  };
}

interface AudioPlaybackData {
  id: string;
  title: string;
  lecturerName: string;
  duration: number;
  format: string; // Actual playback format (mp3 for converted files)
  originalFormat?: string; // Original uploaded format (amr, etc.)
  conversionStatus: 'pending' | 'processing' | 'ready' | 'failed';
  audioUrl: string;
  playCount: number;
}

interface AudioPlayerProps {
  recording: AudioRecording;
  onClose: () => void;
}

export default function AudioPlayer({ recording, onClose }: AudioPlayerProps) {
  const [playbackData, setPlaybackData] = useState<AudioPlaybackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlaybackData();
  }, [recording._id]);

  const fetchPlaybackData = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      // Fetch playback data from the API
      const response = await fetch(`/api/audio/play/${recording._id}`);
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 202) {
          // Still processing
          setError("Audio is still being converted for web playback. Please wait...");
          // Retry after 5 seconds
          setTimeout(() => {
            fetchPlaybackData();
          }, 5000);
          return;
        } else if (response.status === 422) {
          // Conversion failed
          setError(result.message || "Audio conversion failed");
          setIsLoading(false);
          return;
        } else {
          throw new Error(result.message || "Failed to load audio");
        }
      }
      
      if (result.success && result.data) {
        setPlaybackData(result.data);
        setIsLoading(false);
      } else {
        throw new Error(result.message || "Invalid response from server");
      }
    } catch (error) {
      console.error("Error fetching playback data:", error);
      setError(error instanceof Error ? error.message : "Failed to load audio");
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "quran": return "📖";
      case "hadith": return "📜";
      case "tafsir": return "📝";
      case "lecture": return "📚";
      case "dua": return "🤲";
      default: return "🎵";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-emerald-200 shadow-2xl z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2 sm:py-3">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          {/* Recording Info - Compact */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg sm:text-xl flex-shrink-0">{getTypeIcon(recording.type)}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-800 truncate">
                {recording.title}
              </h3>
              <p className="text-xs text-slate-600 truncate">
                by {recording.lecturerName}
              </p>
            </div>
          </div>

          {/* Close Button - Smaller */}
          <button
            onClick={onClose}
            className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Universal Audio Player - Compact */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4 sm:py-6">
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-xs sm:text-sm text-slate-600">Loading audio...</span>
          </div>
        ) : error ? (
          <div className="text-center py-4 sm:py-6">
            <p className="text-xs sm:text-sm text-red-600 mb-2 px-4">{error}</p>
            <button
              onClick={fetchPlaybackData}
              className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 underline"
            >
              Try Again
            </button>
          </div>
        ) : playbackData ? (
          <UniversalAudioPlayer
            audioUrl={playbackData.audioUrl}
            title={playbackData.title}
            format={playbackData.format} // This is now the correct playback format (mp3)
            conversionStatus={playbackData.conversionStatus}
            originalFormat={playbackData.originalFormat}
            onEnded={() => {}}
            onError={(error) => setError(error)}
          />
        ) : null}
      </div>
    </div>
  );
}