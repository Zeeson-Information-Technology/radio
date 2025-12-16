"use client";

interface AudioRecording {
  _id: string;
  title: string;
  description?: string;
  lecturerName: string;
  type: "quran" | "hadith" | "tafsir" | "lecture" | "dua" | "qa";
  tags: string[];
  year?: number;
  duration: number;
  format: string;
  uploadDate: string;
  playCount: number;
  category?: {
    name: string;
    arabicName?: string;
    icon: string;
    color: string;
  };
}

interface AudioCardProps {
  recording: AudioRecording;
  onPlay: () => void;
  isPlaying: boolean;
}

export default function AudioCard({ recording, onPlay, isPlaying }: AudioCardProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "quran": return "📖";
      case "hadith": return "📜";
      case "tafsir": return "📝";
      case "lecture": return "📚";
      case "dua": return "🤲";
      case "qa": return "❓";
      default: return "🎵";
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case "quran": return "bg-emerald-100 text-emerald-800";
      case "hadith": return "bg-blue-100 text-blue-800";
      case "tafsir": return "bg-purple-100 text-purple-800";
      case "lecture": return "bg-orange-100 text-orange-800";
      case "dua": return "bg-teal-100 text-teal-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg border border-emerald-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Header with Category Icon */}
      <div className="p-3 sm:p-4 pb-2">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="text-xl sm:text-2xl flex-shrink-0">{getTypeIcon(recording.type)}</span>
            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getTypeColor(recording.type)} flex-shrink-0`}>
              {recording.type.charAt(0).toUpperCase() + recording.type.slice(1)}
            </span>
          </div>
          <div className="text-right text-xs text-slate-500 flex-shrink-0 ml-2">
            <div className="font-medium">{formatDuration(recording.duration)}</div>
            <div className="hidden sm:block">{recording.playCount} plays</div>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm sm:text-base text-slate-800 mb-1 line-clamp-2 group-hover:text-emerald-700 transition-colors leading-tight">
          {recording.title}
        </h3>

        {/* Lecturer */}
        <p className="text-xs sm:text-sm text-slate-600 mb-2 truncate">
          by <span className="font-medium">{recording.lecturerName}</span>
        </p>

        {/* Description - Hide on mobile to save space */}
        {recording.description && (
          <p className="hidden sm:block text-xs text-slate-500 line-clamp-2 mb-3">
            {recording.description}
          </p>
        )}

        {/* Tags - Show fewer on mobile */}
        {recording.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
            {recording.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-emerald-50 text-emerald-600 rounded-full"
              >
                {tag}
              </span>
            ))}
            {recording.tags.length > 2 && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-slate-100 text-slate-500 rounded-full">
                +{recording.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Metadata - Simplified on mobile */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 sm:mb-3">
          <span className="truncate">📅 {new Date(recording.uploadDate).toLocaleDateString()}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {recording.year && <span className="hidden sm:inline">📆 {recording.year}</span>}
            <span className="uppercase text-xs">{recording.format}</span>
          </div>
        </div>

        {/* Mobile-only play count */}
        <div className="sm:hidden text-xs text-slate-400 mb-2">
          {recording.playCount} plays
        </div>
      </div>

      {/* Play Button */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <button
          onClick={onPlay}
          className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold transition-all text-sm sm:text-base ${
            isPlaying
              ? "bg-emerald-600 text-white shadow-lg"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          }`}
        >
          {isPlaying ? (
            <>
              <div className="w-3 sm:w-4 h-3 sm:h-4 flex items-center justify-center">
                <div className="flex gap-0.5 sm:gap-1">
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-white rounded animate-pulse"></div>
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-white rounded animate-pulse" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-white rounded animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
              <span className="hidden sm:inline">Now Playing</span>
              <span className="sm:hidden">Playing</span>
            </>
          ) : (
            <>
              <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span className="hidden sm:inline">Play Audio</span>
              <span className="sm:hidden">Play</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}