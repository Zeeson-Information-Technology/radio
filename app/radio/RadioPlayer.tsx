"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Navigation from "./components/Navigation";
import PlayerHeader from "./components/PlayerHeader";
import StatusBanners from "./components/StatusBanners";
import PlayerControls from "./components/PlayerControls";
import ScheduleDisplay from "./components/ScheduleDisplay";
import { LiveData, ScheduleData } from "./types";
import { useToast } from "@/lib/contexts/ToastContext";
import { useConfirm } from "@/lib/hooks/useConfirm";

interface RadioPlayerProps {
  initialData: LiveData;
  scheduleData: ScheduleData;
}

export default function RadioPlayer({ initialData, scheduleData }: RadioPlayerProps) {
  const { showError, showWarning } = useToast();
  const { confirm } = useConfirm();
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Ensure we always have valid liveData with proper fallbacks
  const [liveData, setLiveData] = useState<LiveData>(() => {
    // Debug logging
    console.log('🔍 RadioPlayer initialData:', initialData);
    
    // Ensure we have a valid LiveData object
    if (!initialData || typeof initialData !== 'object') {
      console.warn('⚠️ Invalid initialData, using fallback');
      return {
        ok: true,
        isLive: false,
        isMuted: false,
        mutedAt: null,
        title: null,
        lecturer: null,
        startedAt: null,
        streamUrl: process.env.NEXT_PUBLIC_STREAM_URL || "http://localhost:8080/test-stream",
        currentAudioFile: null
      };
    }
    
    // Ensure all required fields exist
    return {
      ok: initialData.ok ?? true,
      isLive: initialData.isLive ?? false,
      isMuted: initialData.isMuted ?? false,
      mutedAt: initialData.mutedAt ?? null,
      title: initialData.title ?? null,
      lecturer: initialData.lecturer ?? null,
      startedAt: initialData.startedAt ?? null,
      streamUrl: initialData.streamUrl ?? (process.env.NEXT_PUBLIC_STREAM_URL || "http://localhost:8080/test-stream"),
      currentAudioFile: initialData.currentAudioFile ?? null
    };
  });
  
  const [volume, setVolume] = useState(80);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null!);

  // Smart automatic updates - checks every 10 seconds when page is visible
  const checkLiveState = async (showLoading = false) => {
    try {
      if (showLoading) setIsRefreshing(true);
      const response = await fetch('/api/live', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.ok) {
        const data = await response.json();
        setLiveData(data);
      }
    } catch (error) {
      console.error('Error checking live state:', error);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  // Real-time updates via Server-Sent Events
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const connectToUpdates = () => {
      try {
        eventSource = new EventSource('/api/live/events');
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle different types of updates
            switch (data.type) {
              case 'broadcast_start':
                console.log('📡 Received broadcast start notification');
                setLiveData({
                  ok: true,
                  isLive: data.isLive,
                  isMuted: data.isMuted || false,
                  mutedAt: data.mutedAt || null,
                  title: data.title,
                  lecturer: data.lecturer,
                  startedAt: data.startedAt,
                  streamUrl: data.streamUrl || liveData.streamUrl,
                  currentAudioFile: data.currentAudioFile || null
                });
                break;
                
              case 'broadcast_stop':
                console.log('📡 Received broadcast stop notification');
                setLiveData({
                  ok: true,
                  isLive: data.isLive || false,
                  isMuted: data.isMuted || false,
                  mutedAt: data.mutedAt || null,
                  title: data.title || null,
                  lecturer: data.lecturer || null,
                  startedAt: data.startedAt || null,
                  streamUrl: data.streamUrl || liveData.streamUrl,
                  currentAudioFile: data.currentAudioFile || null
                });
                break;
                
              case 'broadcast_mute':
              case 'broadcast_unmute':
              case 'broadcast_muted':
              case 'broadcast_unmuted':
                console.log(`📡 Received ${data.type} notification`);
                setLiveData(prev => ({
                  ...prev,
                  isMuted: data.type === 'broadcast_mute' || data.type === 'broadcast_muted',
                  mutedAt: data.mutedAt || null
                }));
                break;
                
              case 'audio_playback_start':
                console.log('📡 Received audio playback start notification');
                setLiveData(prev => ({
                  ...prev,
                  currentAudioFile: data.currentAudioFile
                }));
                break;
                
              case 'audio_playback_stop':
                console.log('📡 Received audio playback stop notification');
                setLiveData(prev => ({
                  ...prev,
                  currentAudioFile: null
                }));
                break;

              case 'audio_playback_pause':
                console.log('📡 Received audio playback pause notification');
                setLiveData(prev => ({
                  ...prev,
                  currentAudioFile: prev.currentAudioFile ? {
                    ...prev.currentAudioFile,
                    isPaused: true
                  } : null
                }));
                break;

              case 'audio_playback_resume':
                console.log('📡 Received audio playback resume notification');
                setLiveData(prev => ({
                  ...prev,
                  currentAudioFile: prev.currentAudioFile ? {
                    ...prev.currentAudioFile,
                    isPaused: false
                  } : null
                }));
                break;

              case 'audio_playback_seek':
                console.log('📡 Received audio playback seek notification');
                setLiveData(prev => ({
                  ...prev,
                  currentAudioFile: prev.currentAudioFile ? {
                    ...prev.currentAudioFile,
                    currentTime: data.currentTime || 0
                  } : null
                }));
                break;

              case 'audio_playback_skip':
                console.log('📡 Received audio playback skip notification');
                // Skip events don't need to update state as they're handled by seek
                break;
                
              case 'connected':
                console.log('📡 Connected to live updates');
                break;
                
              case 'heartbeat':
                // Keep connection alive
                break;
                
              default:
                console.log('📡 Unknown update type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };
        
        eventSource.onerror = (error) => {
          console.warn('SSE connection error, will retry...', error);
          eventSource?.close();
          
          // Retry connection after 5 seconds
          setTimeout(connectToUpdates, 5000);
        };
        
      } catch (error) {
        console.error('Failed to connect to live updates:', error);
      }
    };
    
    // Connect to real-time updates
    connectToUpdates();
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [liveData.streamUrl]);

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Performance optimization: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
      }
    };
  }, []);

  // Performance optimization: Memoized event handlers
  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        // Stop playing
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        console.log('🔇 Audio stopped');
      } else {
        // Check if broadcast is actually live before attempting to play
        if (!liveData.isLive) {
          showError('No Live Broadcast', 'There is currently no live broadcast. Please check the schedule for upcoming programs.');
          return;
        }

        // Warn if broadcast is muted but still allow connection
        if (liveData.isMuted) {
          const shouldContinue = await confirm({
            title: 'Presenter Taking a Break',
            message: 'The presenter is currently taking a break. You can still connect to the stream, but you may not hear audio until they resume. Continue?',
            confirmText: 'Continue',
            cancelText: 'Wait',
            type: 'warning'
          });
          if (!shouldContinue) {
            return;
          }
        }

        // Start playing
        console.log('📡 Broadcast status:', { 
          isLive: liveData.isLive, 
          isMuted: liveData.isMuted,
          streamUrl: liveData.streamUrl,
          lecturer: liveData.lecturer 
        });

        // Test stream availability first
        try {
          const testResponse = await fetch(liveData.streamUrl, { 
            method: 'HEAD',
            mode: 'no-cors'
          });
          console.log('🔍 Stream test response:', testResponse.status);
        } catch (error) {
          console.warn('⚠️ Stream test failed (expected for CORS), proceeding with audio load');
        }

        // Load and play the stream with better error handling
        audioRef.current.load();
        
        // Add event listeners for better error handling
        const handleCanPlay = () => {
          console.log('✅ Audio can play');
        };
        
        const handleError = (error: Event) => {
          console.error('❌ Audio error event:', error);
          setIsPlaying(false);
          
          const audioError = (error.target as HTMLAudioElement)?.error;
          if (audioError) {
            switch (audioError.code) {
              case MediaError.MEDIA_ERR_NETWORK:
                showError('Network Error', 'Unable to connect to the audio stream. Please check your internet connection and try again.');
                break;
              case MediaError.MEDIA_ERR_DECODE:
                showError('Audio Format Error', 'There was a problem with the audio format. Please try refreshing the page.');
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                showError('Stream Unavailable', 'The audio stream is currently unavailable. The broadcast may have ended or there may be a technical issue.');
                break;
              default:
                showError('Playback Error', 'Unable to play the audio stream. Please try again in a moment.');
            }
          }
        };
        
        audioRef.current.addEventListener('canplay', handleCanPlay, { once: true });
        audioRef.current.addEventListener('error', handleError, { once: true });
        
        await audioRef.current.play();
        setIsPlaying(true);
        console.log('🔊 Audio started');
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      
      // Provide user-friendly error message
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          showError('Audio Permission Required', 'Please allow audio playback in your browser. Click the speaker icon in the address bar if needed.');
        } else if (error.name === 'NotSupportedError') {
          showError('Stream Unavailable', 'The audio stream is currently unavailable. The broadcast may have ended or there may be a technical issue.');
        } else if (error.name === 'AbortError') {
          showError('Connection Interrupted', 'The audio connection was interrupted. Please try again.');
        } else {
          showError('Connection Failed', 'Unable to connect to the audio stream. Please check your internet connection and try again.');
        }
      }
    }
  }, [liveData.isLive, liveData.isMuted, liveData.streamUrl, liveData.lecturer, isPlaying, showError, confirm]);

  // Performance optimization: Memoized format function
  const formatStartTime = useCallback((startTime: string): string => {
    try {
      const date = new Date(startTime);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) {
        return 'Just started';
      } else if (diffMins < 60) {
        return `Started ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `Started ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        return `Started ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      return 'Recently started';
    }
  }, []);

  // Performance optimization: Memoized refresh handler
  const handleRefresh = useCallback(() => checkLiveState(true), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation */}
        <Navigation />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Player Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              {/* Header with Live Status */}
              <PlayerHeader 
                liveData={liveData}
                volume={volume}
                onVolumeChange={setVolume}
                formatStartTime={formatStartTime}
              />

              {/* Status Banners */}
              <div className="p-6 pt-4">
                <StatusBanners 
                  liveData={liveData}
                  formatStartTime={formatStartTime}
                />
              </div>

              {/* Player Controls */}
              <PlayerControls 
                liveData={liveData}
                isPlaying={isPlaying}
                audioRef={audioRef}
                onPlayPause={handlePlayPause}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            </div>

            {/* Advertisement Billboard - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block bg-gradient-to-r from-slate-100 via-gray-50 to-slate-100 rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              {/* Advertisement Label */}
              <div className="bg-gray-200 px-4 py-1">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Advertisement</p>
              </div>
              
              {/* Billboard Content */}
              <div className="p-6">
                <div className="flex items-center gap-6">
                  {/* Company Logo */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>

                  {/* Company Information */}
                  <div className="flex-grow">
                    <h2 className="text-2xl font-bold mb-1 text-gray-800">
                      Advert Space
                    </h2>
                    <p className="text-blue-600 font-semibold text-lg mb-3">
                      Service Type
                    </p>
                    
                    {/* Contact Information */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">📍</span>
                          <span className="text-gray-700 font-medium">Technical Area, Lagos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">📱</span>
                          <span className="text-gray-700 font-medium">+234 (0) 803 123 4567</span>
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                          <span className="text-gray-500">📧</span>
                          <span className="text-gray-700 font-medium">info@almanhaj.com</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simple Visual Element */}
                  <div className="flex-shrink-0 hidden md:block">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center border border-blue-200">
                      <div className="text-center">
                        <div className="text-3xl text-blue-600">🏗️</div>
                        <div className="text-xs text-blue-600 font-medium mt-1">Since 2010</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Sidebar */}
          <div className="lg:col-span-1">
            <ScheduleDisplay scheduleData={scheduleData} />
          </div>
        </div>

        {/* Mobile Advertisement - Shown at bottom on mobile only */}
        <div className="lg:hidden mt-8 bg-gradient-to-r from-slate-100 via-gray-50 to-slate-100 rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          {/* Advertisement Label */}
          <div className="bg-gray-200 px-4 py-1">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Advertisement</p>
          </div>
          
          {/* Mobile-optimized Billboard Content */}
          <div className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Company Logo */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>

              {/* Company Information - Mobile Layout */}
              <div className="flex-grow text-center sm:text-left">
                <h2 className="text-lg sm:text-xl font-bold mb-1 text-gray-800">
                  Advert Space
                </h2>
                <p className="text-blue-600 font-semibold text-sm sm:text-base mb-3">
                  Service Type
                </p>
                
                {/* Contact Information - Mobile Compact */}
                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-gray-500">📍</span>
                      <span className="text-gray-700 font-medium">Technical Area, Lagos</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-gray-500">📱</span>
                      <span className="text-gray-700 font-medium">+234 (0) 803 123 4567</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-gray-500">📧</span>
                      <span className="text-gray-700 font-medium">info@almanhaj.com</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Element - Mobile */}
              <div className="flex-shrink-0 sm:hidden">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center border border-blue-200">
                  <div className="text-center">
                    <div className="text-lg text-blue-600">🏗️</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}