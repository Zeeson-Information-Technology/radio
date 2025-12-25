'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SerializedAdmin } from '@/lib/types/admin';
import { useLiveAudioModals } from '@/lib/hooks/useLiveAudioModals';
import { useToast } from '@/lib/contexts/ToastContext';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useModal } from '@/lib/contexts/ModalContext';
import EditAudioModal from '@/components/modals/EditAudioModal';
import LiveAudioPreview from './LiveAudioPreview';

interface AudioFile {
  id: string;
  title: string;
  lecturer: string;
  lecturerName?: string; // API returns lecturerName
  duration: number;
  type: "quran" | "hadith" | "tafsir" | "lecture" | "adhkar" | "qa";
  category?: string; // Keep for backward compatibility
  s3Key?: string;
  url?: string; // Primary URL from API (playbackUrl || cdnUrl || storageUrl)
  createdBy?: string;
  isOwner?: boolean;
  description?: string;
  fileSize?: number;
  visibility?: string;
  broadcastReady?: boolean;
}

interface BroadcastControlPanelProps {
  admin: SerializedAdmin;
  isStreaming: boolean;
  isMuted: boolean;
  isMonitoring: boolean;
  audioInjectionActive: boolean;
  currentAudioFile: string | null;
  feedbackWarning: string | null;
  playbackProgress?: number;
  playbackDuration?: number;
  onMuteToggle: () => void;
  onMonitorToggle: () => void;
  onAudioFilePlay: (fileId: string, fileName: string, duration: number) => void;
  onAudioStop: () => void;
}

export default function BroadcastControlPanel({
  admin,
  isStreaming,
  isMuted,
  isMonitoring,
  audioInjectionActive,
  currentAudioFile,
  feedbackWarning,
  playbackProgress = 0,
  playbackDuration = 0,
  onMuteToggle,
  onMonitorToggle,
  onAudioFilePlay,
  onAudioStop
}: BroadcastControlPanelProps) {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [muteTimeoutReminder, setMuteTimeoutReminder] = useState<string | null>(null);
  const [muteStartTime, setMuteStartTime] = useState<number | null>(null);
  const [previewState, setPreviewState] = useState<{
    fileId: string | null;
    data: any | null;
  }>({ fileId: null, data: null });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Live audio modals
  const { openUploadModal } = useLiveAudioModals();
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm } = useConfirm();
  const { openModal } = useModal();

  // Stop any currently playing preview audio
  const stopCurrentPreview = useCallback((showToast: boolean = true) => {
    setPreviewState(prev => {
      // Only show toast if there's actually audio being previewed AND showToast is true
      if (prev.fileId && showToast) {
        showInfo('Preview Stopped', 'Audio preview stopped');
      }
      return { fileId: null, data: null };
    });
  }, [showInfo]);

  // Wrapper for button clicks
  const handleStopPreview = useCallback(() => {
    stopCurrentPreview(true);
  }, [stopCurrentPreview]);

  // Load audio files from library (Requirements 7.5 - always available for browsing)
  const loadAudioFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch('/api/admin/audio?section=all&broadcastReady=true');
      if (response.ok) {
        const data = await response.json();
        setAudioFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load audio files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // Load audio files on component mount (not just when streaming)
  useEffect(() => {
    loadAudioFiles();
  }, [loadAudioFiles]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      stopCurrentPreview(false); // Don't show toast on unmount
    };
  }, [stopCurrentPreview]);

  // Mute timeout reminder (Requirements 2.7)
  useEffect(() => {
    if (isMuted) {
      setMuteStartTime(Date.now());
      
      // Set 5-minute reminder
      const timeoutId = setTimeout(() => {
        setMuteTimeoutReminder('Your broadcast has been muted for over 5 minutes. Consider unmuting or ending the session.');
        
        // Send reminder to gateway if WebSocket is available
        if (typeof window !== 'undefined' && (window as any).broadcastWebSocket) {
          try {
            (window as any).broadcastWebSocket.send(JSON.stringify({
              type: 'mute_timeout_reminder',
              duration: 5 * 60 * 1000 // 5 minutes in milliseconds
            }));
          } catch (error) {
            console.error('Failed to send mute timeout reminder:', error);
          }
        }
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearTimeout(timeoutId);
    } else {
      setMuteStartTime(null);
      setMuteTimeoutReminder(null);
    }
  }, [isMuted]);

  // Performance optimization: Memoized audio file selection handler with preparation mode
  const handleAudioFileSelect = useCallback(async (file: AudioFile) => {
    if (isStreaming) {
      // Live Mode: Inject audio into broadcast stream immediately
      if (audioInjectionActive) {
        onAudioStop();
      } else {
        onAudioFilePlay(file.id, file.title, file.duration);
      }
    } else {
      // Not Live: Just preview the audio locally
      handleLocalPreview(file);
    }
  }, [isStreaming, audioInjectionActive, onAudioStop, onAudioFilePlay, showSuccess]);

  // Enhanced local preview functionality with full audio player
  const handleLocalPreview = useCallback(async (file: AudioFile) => {
    try {
      // Clear any existing preview data first
      setPreviewState({ fileId: null, data: null });
      
      // Get audio URL from API
      const response = await fetch(`/api/audio/play/${file.id}`);
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 202) {
          showError('Audio Processing', 'Audio is still being converted. Please wait...');
        } else if (response.status === 422) {
          showError('Conversion Failed', result.message || 'Audio conversion failed');
        } else {
          showError('Load Failed', result.message || 'Failed to load audio');
        }
        return;
      }
      
      if (!result.success || !result.data) {
        showError('Invalid Response', 'Invalid response from server');
        return;
      }
      
      const newPreviewData = {
        id: file.id,
        title: file.title,
        lecturerName: file.lecturerName || file.lecturer,
        duration: file.duration,
        format: result.data.format || 'mp3',
        originalFormat: result.data.originalFormat,
        conversionStatus: result.data.conversionStatus || 'ready',
        audioUrl: result.data.audioUrl,
        playCount: 0
      };
      
      // Set both in a single state update to avoid race conditions
      setPreviewState({ fileId: file.id, data: newPreviewData });
      
    } catch (error) {
      showError('Preview Failed', error instanceof Error ? error.message : 'Failed to load audio');
      setPreviewState({ fileId: null, data: null });
    }
  }, [showError]);
  // Performance optimization: Memoized format duration function
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get type icon for audio files (same as library)
  const getTypeIcon = useCallback((type: string): string => {
    switch (type) {
      case "quran": return "📖";
      case "hadith": return "📜";
      case "tafsir": return "📝";
      case "lecture": return "📚";
      case "adhkar": return "🤲";
      case "qa": return "❓";
      default: return "🎵";
    }
  }, []);

  // Handle opening edit modal for audio file
  const handleEditAudio = useCallback((file: AudioFile) => {
    // Convert AudioFile to the format expected by EditAudioModal
    const modalAudioFile = {
      id: file.id,
      title: file.title,
      description: file.description || '',
      lecturerName: file.lecturerName || file.lecturer,
      category: {
        name: file.category || 'General',
        icon: getTypeIcon(file.type || 'lecture'),
        color: '#10b981'
      },
      duration: file.duration,
      fileSize: file.fileSize || 0,
      url: file.url || '',
      visibility: (file.visibility as 'private' | 'shared' | 'public') || 'private',
      sharedWith: [],
      createdBy: {
        _id: file.createdBy || admin._id,
        name: admin.name,
        email: admin.email
      },
      broadcastReady: file.broadcastReady || false,
      broadcastUsageCount: 0,
      createdAt: new Date().toISOString(),
      isFavorite: false,
      isOwner: file.isOwner || true,
      type: file.type || 'lecture',
      year: new Date().getFullYear(),
      tags: []
    };

    openModal(
      <EditAudioModal
        audioFile={modalAudioFile}
        onSave={handleSaveAudio}
        apiEndpoint="/api/audio/recordings"
        isLiveAudio={true}
      />
    );
  }, [admin, openModal, getTypeIcon]);

  // Handle saving edited audio file
  const handleSaveAudio = useCallback(async (updatedFile: any) => {
    try {
      showSuccess('Audio Updated', 'Audio file has been updated successfully');
      // Refresh the audio list to show changes
      loadAudioFiles();
    } catch (error) {
      showError('Update Failed', 'Failed to update audio file');
    }
  }, [showSuccess, showError, loadAudioFiles]);

  // Performance optimization: Memoized mute duration calculation
  const getMuteDuration = useCallback((): string => {
    if (!muteStartTime) return '0:00';
    const elapsed = Math.floor((Date.now() - muteStartTime) / 1000);
    return formatDuration(elapsed);
  }, [muteStartTime, formatDuration]);

  // Don't hide the component when not streaming - always show for audio library access
  // Only hide broadcast-specific controls when not streaming
  const showBroadcastControls = isStreaming;
  return (
    <div className="mt-6 lg:mt-8 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 rounded-2xl lg:rounded-3xl shadow-2xl border-2 border-emerald-100/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 px-4 py-4 lg:px-8 lg:py-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h2 className="text-lg lg:text-2xl font-bold text-white mb-1 lg:mb-2">
            {showBroadcastControls ? 'Broadcast Controls' : 'Broadcast Audio'}
          </h2>
          <p className="text-emerald-100 text-sm lg:text-base">
            {showBroadcastControls 
              ? 'Professional broadcasting tools for live sessions' 
              : 'Manage audio files for live broadcast injection'
            }
          </p>
        </div>
      </div>

      <div className="p-4 lg:p-8">
        {/* Mute Timeout Reminder (Requirements 2.7) */}
        {muteTimeoutReminder && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl shadow-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-amber-800 font-semibold">Mute Timeout Reminder</p>
                <p className="text-amber-700 text-sm">{muteTimeoutReminder}</p>
                <p className="text-amber-600 text-xs mt-1">Muted for: {getMuteDuration()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Warning (Requirements 1.5) */}
        {feedbackWarning && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl shadow-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-red-800 font-semibold">Audio Feedback Warning</p>
                <p className="text-red-700 text-sm">{feedbackWarning}</p>
              </div>
            </div>
          </div>
        )}
        {/* Main Control Grid - Only show when streaming (Requirements 4.1) */}
        {showBroadcastControls && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            
            {/* Broadcast Controls */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-slate-200 shadow-lg">
              <h3 className="text-base lg:text-lg font-bold text-slate-800 mb-3 lg:mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
                </svg>
                <span className="text-sm lg:text-base">Broadcast Controls</span>
              </h3>
              
              <div className="space-y-3 lg:space-y-4">
                {/* Mute Toggle (Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6) */}
                <div className="flex items-center justify-between p-3 lg:p-4 bg-white rounded-lg lg:rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm lg:text-base">
                        {isMuted ? 'Broadcast Muted' : 'Broadcasting Live'}
                      </p>
                      <p className="text-xs lg:text-sm text-slate-600 truncate">
                        {isMuted ? `Muted for ${getMuteDuration()}` : 'Audio is live to listeners'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onMuteToggle}
                    className={`px-3 py-2 lg:px-6 lg:py-3 rounded-lg lg:rounded-xl font-semibold transition-all shadow-lg text-xs lg:text-sm ${
                      isMuted
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                    }`}
                    title={isMuted ? "Resume broadcasting to listeners" : "Temporarily pause broadcast (listeners stay connected)"}
                  >
                    {isMuted ? (
                      <>
                        <svg className="w-3 h-3 lg:w-5 lg:h-5 inline mr-1 lg:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 10l6-6v4h8v4H12v4l-6-6z" />
                        </svg>
                        <span className="hidden sm:inline">Unmute</span>
                        <span className="sm:hidden">On</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 lg:w-5 lg:h-5 inline mr-1 lg:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        <span className="hidden sm:inline">Mute</span>
                        <span className="sm:hidden">Off</span>
                      </>
                    )}
                  </button>
                </div>
                {/* Monitor Toggle (Requirements 1.1, 1.2, 1.3, 1.4) */}
                <div className="flex items-center justify-between p-3 lg:p-4 bg-white rounded-lg lg:rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${isMonitoring ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm lg:text-base">
                        Audio Monitoring
                      </p>
                      <p className="text-xs lg:text-sm text-slate-600 truncate">
                        {isMonitoring ? 'You can hear yourself' : 'Monitor mode disabled'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onMonitorToggle}
                    className={`px-3 py-2 lg:px-6 lg:py-3 rounded-lg lg:rounded-xl font-semibold transition-all shadow-lg text-xs lg:text-sm ${
                      isMonitoring
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
                        : 'bg-gradient-to-r from-slate-400 to-slate-500 text-white hover:from-slate-500 hover:to-slate-600'
                    }`}
                    title={isMonitoring ? "Turn off audio monitoring (recommended to prevent feedback)" : "Turn on audio monitoring to hear yourself"}
                  >
                    {isMonitoring ? (
                      <>
                        <svg className="w-3 h-3 lg:w-5 lg:h-5 inline mr-1 lg:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                        </svg>
                        <span className="hidden sm:inline">Monitor ON</span>
                        <span className="sm:hidden">ON</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 lg:w-5 lg:h-5 inline mr-1 lg:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        <span className="hidden sm:inline">Monitor OFF</span>
                        <span className="sm:hidden">OFF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            {/* Audio Injection Status */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-slate-200 shadow-lg">
              <h3 className="text-base lg:text-lg font-bold text-slate-800 mb-3 lg:mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-sm lg:text-base">Audio Playback</span>
              </h3>

              {audioInjectionActive && currentAudioFile ? (
                <div className="space-y-3 lg:space-y-4">
                  {/* Currently Playing (Requirements 3.7) */}
                  <div className="p-3 lg:p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg lg:rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                      <div className="w-2 h-2 lg:w-3 lg:h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                      <p className="font-semibold text-emerald-800 text-sm lg:text-base">Now Playing</p>
                    </div>
                    <p className="text-emerald-700 font-medium mb-2 text-sm lg:text-base truncate">{currentAudioFile}</p>
                    
                    {/* Progress Bar (Requirements 3.5) */}
                    <div className="space-y-1 lg:space-y-2">
                      <div className="w-full h-1.5 lg:h-2 bg-emerald-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
                          style={{ width: `${(playbackProgress / playbackDuration) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs lg:text-sm text-emerald-600">
                        <span>{formatDuration(playbackProgress)}</span>
                        <span>{formatDuration(playbackDuration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stop Button (Requirements 3.6) */}
                  <button
                    onClick={onAudioStop}
                    className="w-full px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg lg:rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg text-sm lg:text-base"
                  >
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 inline mr-1 lg:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                    </svg>
                    Stop Audio
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 lg:py-8">
                  <svg className="w-8 h-8 lg:w-12 lg:h-12 text-slate-400 mx-auto mb-2 lg:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-slate-600 font-medium text-sm lg:text-base">No audio playing</p>
                  <p className="text-slate-500 text-xs lg:text-sm">Select a file below to play during broadcast</p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Broadcast Audio Library (Requirements 3.1, 3.8) - Always visible for broadcast-ready files */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-slate-200 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-6 mb-4 lg:mb-6">
            <h3 className="text-base lg:text-lg font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm lg:text-base">Broadcast Audio Library</span>
            </h3>
            <div className="flex items-center gap-2 lg:gap-3">
              <button
                onClick={() => openUploadModal(loadAudioFiles)}
                className="inline-flex items-center gap-1 lg:gap-2 px-3 py-2 lg:px-4 lg:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-xs lg:text-sm"
              >
                <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="hidden sm:inline">📤 Upload Audio</span>
                <span className="sm:hidden">📤 Upload</span>
              </button>
              <button
                onClick={loadAudioFiles}
                disabled={isLoadingFiles}
                className="px-3 py-2 lg:px-4 lg:py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-xs lg:text-sm"
              >
                {isLoadingFiles ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Browse mode notice when not streaming */}
          {!isStreaming && (
            <div className="mb-3 lg:mb-4 p-3 lg:p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2 lg:gap-3 text-blue-800">
                <span className="text-lg lg:text-2xl flex-shrink-0">📡</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm lg:text-base">Broadcast Audio - Browse Mode</p>
                  <p className="text-xs lg:text-sm text-blue-700 mt-1">
                    Browse broadcast-ready audio files. To inject audio into a live broadcast, click "Start Broadcasting" above.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Audio Preview Player */}
          {previewState.fileId && previewState.data && (
            <div className="mb-3 lg:mb-4 p-3 lg:p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-purple-800 text-sm lg:text-base flex items-center gap-2">
                  <span className="text-lg">🎧</span>
                  Audio Preview
                </h4>
                <button
                  onClick={handleStopPreview}
                  className="px-2 py-1 lg:px-3 lg:py-2 text-xs lg:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  ✕ Close
                </button>
              </div>
              
              <LiveAudioPreview
                audioUrl={previewState.data.audioUrl}
                title={previewState.data.title}
                format={previewState.data.format}
                onEnded={() => {
                  showInfo('Preview Complete', 'Audio preview finished');
                  setPreviewState({ fileId: null, data: null });
                }}
                onError={(error) => {
                  showError('Preview Error', error);
                  setPreviewState({ fileId: null, data: null });
                }}
              />
            </div>
          )}
          {isLoadingFiles ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-slate-600">Loading audio files...</p>
            </div>
          ) : audioFiles.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-slate-600 font-medium mb-2">No broadcast-ready audio files</p>
              <p className="text-slate-500 text-sm">Upload audio files and mark them as broadcast-ready for live injection</p>
            </div>
          ) : (
            <div className="grid gap-2 lg:gap-3 max-h-48 lg:max-h-64 overflow-y-auto">
              {audioFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-white rounded-lg lg:rounded-xl border border-slate-200 hover:border-emerald-300 transition-all shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-sm lg:text-base">{file.title}</p>
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1">
                      <p className="text-xs lg:text-sm text-slate-600 truncate">{file.lecturerName || file.lecturer}</p>
                      <div className="flex items-center gap-1 lg:gap-2">
                        <span className="text-xs lg:text-sm">{getTypeIcon(file.type || 'lecture')}</span>
                        <span className="text-xs text-slate-500 capitalize">{file.type || 'lecture'}</span>
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {formatDuration(file.duration)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Edit button - only for admin or file owner */}
                    {(admin.role === 'super_admin' || admin.role === 'admin' || file.isOwner) && (
                      <button
                        onClick={() => handleEditAudio(file)}
                        className="px-2 py-1 lg:px-3 lg:py-2 text-xs lg:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Edit audio information"
                      >
                        ✏️ <span className="hidden sm:inline">Edit</span>
                      </button>
                    )}

                    {/* Delete button - only for admin or file owner */}
                    {(admin.role === 'super_admin' || admin.role === 'admin' || file.isOwner) && (
                      <button
                        onClick={async () => {
                          const shouldDelete = await confirm({
                            title: 'Delete Audio File',
                            message: `Are you sure you want to delete "${file.title}"?\n\nThis action cannot be undone.`,
                            confirmText: 'Delete',
                            cancelText: 'Cancel',
                            type: 'danger'
                          });
                          
                          if (shouldDelete) {
                            try {
                              const response = await fetch(`/api/audio/recordings/${file.id}`, {
                                method: 'DELETE'
                              });
                              
                              if (response.ok) {
                                showSuccess('Audio Deleted', `"${file.title}" has been deleted successfully`);
                                loadAudioFiles(); // Refresh the list
                              } else {
                                const errorData = await response.json();
                                showError('Delete Failed', errorData.message || 'Failed to delete audio file');
                              }
                            } catch (error) {
                              showError('Delete Failed', 'An error occurred while deleting');
                            }
                          }
                        }}
                        className="px-2 py-1 lg:px-3 lg:py-2 text-xs lg:text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete audio file"
                      >
                        🗑️ <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                    
                    {/* Play button - always available for all users */}
                    {isStreaming ? (
                      <button
                        onClick={() => handleAudioFileSelect(file)}
                        disabled={audioInjectionActive && currentAudioFile === file.title}
                        className={`px-3 py-2 lg:px-4 lg:py-2 rounded-lg font-medium transition-all text-xs lg:text-sm ${
                          audioInjectionActive && currentAudioFile === file.title
                            ? 'bg-red-100 text-red-700 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {audioInjectionActive && currentAudioFile === file.title ? (
                          <>⏹️ <span className="hidden sm:inline">Playing</span></>
                        ) : (
                          <>📡 <span className="hidden sm:inline">Play on Air</span><span className="sm:hidden">Play</span></>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {previewState.fileId === file.id ? (
                          <button
                            onClick={handleStopPreview}
                            className="px-3 py-2 lg:px-4 lg:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs lg:text-sm"
                            title="Close preview player"
                          >
                            🎧 <span className="hidden sm:inline">Close Preview</span><span className="sm:hidden">Close</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLocalPreview(file)}
                            className="px-3 py-2 lg:px-4 lg:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs lg:text-sm"
                            title="Preview this audio file with full controls"
                          >
                            🎧 <span className="hidden sm:inline">Preview</span><span className="sm:hidden">Preview</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Summary - Only show when streaming (Requirements 4.3) */}
        {showBroadcastControls && (
          <div className="mt-4 lg:mt-6 p-3 lg:p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg lg:rounded-xl border border-emerald-200">
            <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-6 text-xs lg:text-sm">
              <div className="flex items-center gap-1 lg:gap-2">
                <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="font-medium text-emerald-800">
                  {isMuted ? 'Muted' : 'Live'}
                </span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${isMonitoring ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                <span className="font-medium text-emerald-800">
                  Monitor {isMonitoring ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${audioInjectionActive ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                <span className="font-medium text-emerald-800">
                  Audio {audioInjectionActive ? 'Playing' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}