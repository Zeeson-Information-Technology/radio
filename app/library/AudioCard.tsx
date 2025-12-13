"use client";

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
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Header with Category Icon */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getTypeIcon(recording.type)}</span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(recording.type)}`}>
              {recording.type.charAt(0).toUpperCase() + recording.type.slice(1)}
            </span>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>{formatDuration(recording.duration)}</div>
            <div>{recording.playCount} plays</div>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {recording.title}
        </h3>

        {/* Lecturer */}
        <p className="text-sm text-slate-600 mb-2">
          by <span className="font-medium">{recording.lecturerName}</span>
        </p>

        {/* Description */}
        {recording.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
            {recording.description}
          </p>
        )}

        {/* Tags */}
        {recording.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recording.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded-full"
              >
                {tag}
              </span>
            ))}
            {recording.tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-slate-100 text-slate-500 rounded-full">
                +{recording.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span>📅 {new Date(recording.uploadDate).toLocaleDateString()}</span>
          {recording.year && <span>📆 {recording.year}</span>}
          <span className="uppercase">{recording.format}</span>
        </div>
      </div>

      {/* Play Button */}
      <div className="px-4 pb-4">
        <button
          onClick={onPlay}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
            isPlaying
              ? "bg-emerald-600 text-white shadow-lg"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          }`}
        >
          {isPlaying ? (
            <>
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-white rounded animate-pulse"></div>
                  <div className="w-1 h-3 bg-white rounded animate-pulse" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-1 h-3 bg-white rounded animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
              Now Playing
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play Audio
            </>
          )}
        </button>
      </div>
    </div>
  );
}