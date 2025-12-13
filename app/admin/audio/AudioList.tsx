"use client";

import { useState, useEffect } from "react";
import { SerializedAdmin } from "@/lib/types/admin";
import EditRecordingModal from "./EditRecordingModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import UniversalAudioPlayer from "../../components/UniversalAudioPlayer";

interface AudioListProps {
  admin: SerializedAdmin;
}

interface AudioRecording {
  _id: string;
  title: string;
  description?: string;
  lecturerName: string;
  type: "quran" | "hadith" | "tafsir" | "lecture" | "dua";
  tags: string[];
  year?: number;
  fileName: string;
  fileSize: number;
  duration: number;
  format: string;
  uploadDate: string;
  playCount: number;
  status: "processing" | "active" | "archived";
  isPublic: boolean;
  conversionStatus?: "pending" | "processing" | "ready" | "failed";
  originalFormat?: string;
  playbackFormat?: string;
}

export default function AudioList({ admin }: AudioListProps) {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("uploadDate");
  const [playingRecording, setPlayingRecording] = useState<AudioRecording | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [editingRecording, setEditingRecording] = useState<AudioRecording | null>(null);
  const [deletingRecording, setDeletingRecording] = useState<AudioRecording | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchRecordings();
  }, []);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-dismiss error messages after 8 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/audio/recordings");
      
      if (!response.ok) {
        throw new Error("Failed to fetch recordings");
      }
      
      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      setError("Failed to load audio recordings");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active": return "text-emerald-600 bg-emerald-50";
      case "processing": return "text-yellow-600 bg-yellow-50";
      case "archived": return "text-slate-600 bg-slate-50";
      default: return "text-slate-600 bg-slate-50";
    }
  };

  const handlePlay = async (recording: AudioRecording) => {
    try {
      if (playingRecording?._id === recording._id) {
        // Stop current audio
        setPlayingRecording(null);
        setAudioUrl("");
        return;
      }

      setLoadingAudioId(recording._id);

      // Get audio URL from API
      const response = await fetch(`/api/audio/play/${recording._id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get audio URL");
      }

      const data = await response.json();
      
      if (data.success && data.data.audioUrl) {
        setLoadingAudioId(null);
        setPlayingRecording(recording);
        setAudioUrl(data.data.audioUrl);
      } else {
        throw new Error("No audio URL received");
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(`Failed to play audio: ${errorMessage}`);
      setLoadingAudioId(null);
    }
  };

  const handleAudioEnded = () => {
    setPlayingRecording(null);
    setAudioUrl("");
  };

  const handleAudioError = (error: string) => {
    setErrorMessage(`Audio playback error: ${error}`);
    setPlayingRecording(null);
    setAudioUrl("");
  };

  const handleEdit = (recording: AudioRecording) => {
    setEditingRecording(recording);
  };

  const handleSaveEdit = async (updatedData: Partial<AudioRecording>) => {
    if (!editingRecording) return;

    try {
      const response = await fetch(`/api/audio/recordings/${editingRecording._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Failed to update recording');
      }

      // Refresh the recordings list
      await fetchRecordings();
      setEditingRecording(null);
      setSuccessMessage("Recording updated successfully!");
    } catch (error) {
      console.error('Error updating recording:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(`Failed to update recording: ${errorMessage}`);
    }
  };





  const handleDelete = (recording: AudioRecording) => {
    setDeletingRecording(recording);
  };

  const confirmDelete = async () => {
    if (!deletingRecording) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/audio/recordings/${deletingRecording._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete recording');
      }

      // Refresh the recordings list
      await fetchRecordings();
      
      // Stop playing if this recording was playing
      if (playingRecording?._id === deletingRecording._id) {
        setPlayingRecording(null);
        setAudioUrl("");
      }
      
      setDeletingRecording(null);
      setSuccessMessage("Recording deleted successfully!");
    } catch (error) {
      console.error('Error deleting recording:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(`Failed to delete recording: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort recordings
  const filteredRecordings = recordings
    .filter(recording => {
      const matchesSearch = !searchQuery || 
        recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.lecturerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = filterType === "all" || recording.type === filterType;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "lecturer":
          return a.lecturerName.localeCompare(b.lecturerName);
        case "playCount":
          return b.playCount - a.playCount;
        case "uploadDate":
        default:
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      }
    });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-slate-600">Loading audio recordings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <p className="text-lg text-red-600 mb-2">Error Loading Recordings</p>
        <p className="text-slate-600 mb-4">{error}</p>
        <button
          onClick={fetchRecordings}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by title, lecturer, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="quran">📖 Quran</option>
              <option value="hadith">📜 Hadith</option>
              <option value="tafsir">📝 Tafsir</option>
              <option value="lecture">📚 Lecture</option>
              <option value="dua">🤲 Dua</option>
            </select>
          </div>
          
          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="uploadDate">Latest First</option>
              <option value="title">Title A-Z</option>
              <option value="lecturer">Lecturer A-Z</option>
              <option value="playCount">Most Played</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-slate-600">
          {filteredRecordings.length} of {recordings.length} recordings
        </p>
        <button
          onClick={fetchRecordings}
          className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Audio Player */}
      {playingRecording && audioUrl && (
        <UniversalAudioPlayer
          audioUrl={audioUrl}
          title={playingRecording.title}
          format={playingRecording.playbackFormat || playingRecording.format}
          conversionStatus={playingRecording.conversionStatus}
          originalFormat={playingRecording.originalFormat}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
        />
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="text-red-400 hover:text-red-600 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-emerald-800">Success</h4>
                <p className="text-emerald-700 text-sm mt-1">{successMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-emerald-400 hover:text-emerald-600 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Recordings List */}
      {filteredRecordings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="text-6xl mb-4">🎵</div>
          <p className="text-lg text-slate-600 mb-2">
            {recordings.length === 0 ? "No audio recordings yet" : "No recordings match your search"}
          </p>
          <p className="text-slate-500">
            {recordings.length === 0 
              ? "Upload your first audio recording to get started"
              : "Try adjusting your search or filters"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecordings.map((recording) => (
            <div
              key={recording._id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(recording.type)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {recording.title}
                      </h3>
                      <p className="text-slate-600">by {recording.lecturerName}</p>
                    </div>
                  </div>
                  
                  {recording.description && (
                    <p className="text-slate-600 mb-3 line-clamp-2">
                      {recording.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span>📅 {new Date(recording.uploadDate).toLocaleDateString()}</span>
                    {recording.duration > 0 && (
                      <span>⏱️ {formatDuration(recording.duration)}</span>
                    )}
                    <span>📊 {formatFileSize(recording.fileSize)}</span>
                    <span className={['amr', 'amr-wb', '3gp', '3gp2', 'wma'].includes(recording.format.toLowerCase()) ? 'text-amber-600' : 'text-emerald-600'}>
                      {['mp3', 'm4a', 'wav', 'flac', 'ogg'].includes(recording.format.toLowerCase()) ? '🎵' : 
                       ['amr', 'amr-wb'].includes(recording.format.toLowerCase()) ? '📱' :
                       ['3gp', '3gp2'].includes(recording.format.toLowerCase()) ? '📞' :
                       recording.format.toLowerCase() === 'wma' ? '🪟' : '🎵'} {recording.format.toUpperCase()}
                      {['amr', 'amr-wb', '3gp', '3gp2', 'wma'].includes(recording.format.toLowerCase()) && (
                        <span className="ml-1 text-amber-600" title="This format requires download for playback - not supported in browsers">⬇️</span>
                      )}
                    </span>
                    <span>🎧 {recording.playCount} plays</span>
                    {recording.year && <span>📆 {recording.year}</span>}
                  </div>
                  
                  {recording.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {recording.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-2 ml-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(recording.status)}`}>
                    {recording.status}
                  </span>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(recording)}
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Edit recording details"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handlePlay(recording)}
                      className={`p-2 transition-colors ${
                        playingRecording?._id === recording._id 
                          ? "text-blue-600" 
                          : loadingAudioId === recording._id
                          ? "text-yellow-600"
                          : "text-slate-400 hover:text-blue-600"
                      }`}
                      title={
                        playingRecording?._id === recording._id 
                          ? "Stop audio" 
                          : loadingAudioId === recording._id
                          ? "Loading audio..."
                          : "Play audio"
                      }
                      disabled={loadingAudioId === recording._id}
                    >
                      {playingRecording?._id === recording._id 
                        ? "⏸️" 
                        : loadingAudioId === recording._id
                        ? "⏳"
                        : "▶️"
                      }
                    </button>

                    <button 
                      onClick={() => handleDelete(recording)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete recording"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingRecording && (
        <EditRecordingModal
          recording={editingRecording}
          isOpen={!!editingRecording}
          onClose={() => setEditingRecording(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecording && (
        <DeleteConfirmModal
          isOpen={!!deletingRecording}
          recordingTitle={deletingRecording.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingRecording(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}