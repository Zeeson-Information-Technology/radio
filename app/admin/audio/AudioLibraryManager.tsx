"use client";

import { useState, useEffect, useCallback } from "react";
import { SerializedAdmin } from "@/lib/types/admin";
import AudioPlayer from "../../library/AudioPlayer";
import { useAudioModals } from "@/lib/hooks/useAudioModals";
import { useToast } from "@/lib/contexts/ToastContext";

interface AudioFile {
  id: string;
  title: string;
  description?: string;
  lecturerName: string;
  category: {
    name: string;
    icon?: string;
    color?: string;
  };
  duration: number;
  fileSize: number;
  url: string;
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  broadcastReady: boolean;
  broadcastUsageCount: number;
  createdAt: string;
  isFavorite: boolean;
  isOwner: boolean;
}

interface AudioLibraryManagerProps {
  admin: SerializedAdmin;
}

type SectionType = 'all' | 'my' | 'shared' | 'station';

export default function AudioLibraryManager({ admin }: AudioLibraryManagerProps) {
  const [activeSection, setActiveSection] = useState<SectionType>('all');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showBroadcastReady, setShowBroadcastReady] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // Audio player state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<AudioFile | null>(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  
  // Audio modals
  const { openEditModal, openDeleteModal } = useAudioModals({
    isLiveAudio: false,
    apiEndpoint: '/api/audio/recordings'
  });

  // Toast notifications
  const { showSuccess, showError, showWarning } = useToast();
  
  // Modal states - removed (now handled globally)
  // const [editModalFile, setEditModalFile] = useState<AudioFile | null>(null);
  // const [deleteModalFile, setDeleteModalFile] = useState<AudioFile | null>(null);

  // Load audio files based on current section and filters
  const loadAudioFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        section: activeSection,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(showBroadcastReady && { broadcastReady: 'true' }),
        limit: '50',
        offset: '0'
      });

      const response = await fetch(`/api/admin/audio?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAudioFiles(data.files || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error('Failed to load audio files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeSection, searchQuery, selectedCategory, showBroadcastReady]);

  // Load files when section or filters change
  useEffect(() => {
    loadAudioFiles();
  }, [loadAudioFiles]);

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Get section counts for display
  // Audio player handlers
  const handlePlayAudio = (file: AudioFile) => {
    // Convert AudioFile to AudioRecording format expected by AudioPlayer
    const recording = {
      _id: file.id,
      title: file.title,
      description: file.description,
      lecturerName: file.lecturerName,
      type: 'lecture' as const, // Default type, could be enhanced
      tags: [], // Could be enhanced to include actual tags
      category: file.category,
      year: new Date(file.createdAt).getFullYear(),
      duration: file.duration,
      format: 'mp3', // Default format
      uploadDate: file.createdAt,
      playCount: file.broadcastUsageCount || 0
    };
    
    setCurrentlyPlaying(file);
    setIsPlayerVisible(true);
  };

  const handleClosePlayer = () => {
    setIsPlayerVisible(false);
    setCurrentlyPlaying(null);
  };

  // Delete audio file (super admin or uploader only)
  const handleDeleteAudio = async (file: AudioFile) => {
    // Check permissions
    const canDelete = admin.role === 'super_admin' || file.isOwner;
    if (!canDelete) {
      showWarning('Permission Denied', 'You can only delete your own audio files.');
      return;
    }

    openDeleteModal(file, async () => {
      const response = await fetch(`/api/audio/recordings/${file.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setAudioFiles(files => files.filter(f => f.id !== file.id));
        setTotalCount(count => count - 1);
        showSuccess('Audio Deleted', 'Audio file deleted successfully.');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete audio file.');
      }
    });
  };

  // Edit audio file (placeholder - could open edit modal)
  const handleEditAudio = (file: AudioFile) => {
    // Check permissions
    const canEdit = admin.role === 'super_admin' || file.isOwner;
    if (!canEdit) {
      showWarning('Permission Denied', 'You can only edit your own audio files.');
      return;
    }

    openEditModal(file, (updatedData) => {
      // Update local state
      setAudioFiles(files => 
        files.map(f => 
          f.id === file.id 
            ? { ...f, ...updatedData }
            : f
        )
      );
    });
  };

  const getSectionCounts = () => {
    // This would ideally come from the API, but for now we'll show the current count
    return {
      all: totalCount,
      my: activeSection === 'my' ? totalCount : 0,
      shared: activeSection === 'shared' ? totalCount : 0,
      station: activeSection === 'station' ? totalCount : 0
    };
  };

  const sectionCounts = getSectionCounts();

  return (
    <div className="space-y-6">
      {/* Section Tabs (Requirements 7.6) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${
              activeSection === 'all'
                ? 'text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500'
                : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-25'
            }`}
          >
            📚 All Audio ({sectionCounts.all})
          </button>
          
          <button
            onClick={() => setActiveSection('station')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${
              activeSection === 'station'
                ? 'text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500'
                : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-25'
            }`}
          >
            🏢 Station Library ({sectionCounts.station})
          </button>
          
          <button
            onClick={() => setActiveSection('my')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${
              activeSection === 'my'
                ? 'text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500'
                : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-25'
            }`}
          >
            👤 My Audio ({sectionCounts.my})
          </button>
          
          <button
            onClick={() => setActiveSection('shared')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${
              activeSection === 'shared'
                ? 'text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500'
                : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-25'
            }`}
          >
            🤝 Shared with Me ({sectionCounts.shared})
          </button>
        </div>
      </div>

      {/* Search and Filters (Requirements 7.8) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search audio files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            <option value="quran">Quran Recitation</option>
            <option value="hadith">Hadith</option>
            <option value="tafsir">Tafsir</option>
            <option value="lecture">Islamic Lectures</option>
            <option value="adhkar">Adhkar & Dhikr</option>
          </select>
          
          {/* Broadcast Ready Filter */}
          <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
            <input
              type="checkbox"
              checked={showBroadcastReady}
              onChange={(e) => setShowBroadcastReady(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-slate-700">Broadcast Ready</span>
          </label>
          
          {/* Refresh Button */}
          <button
            onClick={loadAudioFiles}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Audio Files Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-600">Loading audio files...</span>
          </div>
        ) : audioFiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Audio Files Found</h3>
            <p className="text-slate-600">
              {activeSection === 'my' && "You haven't uploaded any audio files yet."}
              {activeSection === 'shared' && "No audio files have been shared with you."}
              {activeSection === 'station' && "No public audio files available."}
              {activeSection === 'all' && "No audio files match your current filters."}
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid gap-4">
              {audioFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-800 truncate">{file.title}</h4>
                      
                      {/* Visibility Badge */}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        file.visibility === 'public' ? 'bg-green-100 text-green-700' :
                        file.visibility === 'shared' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {file.visibility === 'public' ? '🌍 Public' :
                         file.visibility === 'shared' ? '🤝 Shared' :
                         '🔒 Private'}
                      </span>
                      
                      {/* Broadcast Ready Badge */}
                      {file.broadcastReady && (
                        <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                          📡 Broadcast Ready
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>👨‍🏫 {file.lecturerName}</span>
                      <span>⏱️ {formatDuration(file.duration)}</span>
                      <span>💾 {formatFileSize(file.fileSize)}</span>
                      <span>📂 {file.category.name}</span>
                      {file.broadcastUsageCount > 0 && (
                        <span>📊 Used {file.broadcastUsageCount} times</span>
                      )}
                    </div>
                    
                    {!file.isOwner && (
                      <div className="mt-1 text-xs text-slate-500">
                        Uploaded by {file.createdBy.name}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {/* Play Button */}
                    <button
                      onClick={() => handlePlayAudio(file)}
                      className={`p-2 rounded-lg transition-colors ${
                        currentlyPlaying?.id === file.id
                          ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600'
                      }`}
                      title="Play audio"
                    >
                      {currentlyPlaying?.id === file.id ? '⏸️' : '▶️'}
                    </button>
                    
                    {/* Edit Button (owner or super admin only) */}
                    {(admin.role === 'super_admin' || file.isOwner) && (
                      <button
                        onClick={() => handleEditAudio(file)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Edit audio file"
                      >
                        ✏️
                      </button>
                    )}
                    
                    {/* Delete Button (owner or super admin only) */}
                    {(admin.role === 'super_admin' || file.isOwner) && (
                      <button
                        onClick={() => handleDeleteAudio(file)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete audio file"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Audio Player */}
      {isPlayerVisible && currentlyPlaying && (
        <AudioPlayer
          recording={{
            _id: currentlyPlaying.id,
            title: currentlyPlaying.title,
            description: currentlyPlaying.description,
            lecturerName: currentlyPlaying.lecturerName,
            type: 'lecture' as const,
            tags: [],
            category: currentlyPlaying.category,
            year: new Date(currentlyPlaying.createdAt).getFullYear(),
            duration: currentlyPlaying.duration,
            format: 'mp3',
            uploadDate: currentlyPlaying.createdAt,
            playCount: currentlyPlaying.broadcastUsageCount || 0
          }}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  );
}