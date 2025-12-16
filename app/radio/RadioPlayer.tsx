"use client";

import { useState, useRef, useEffect } from "react";
import { convertUTCToLocal, convertTimezoneToLocal, getUserTimezoneDisplay, getUserTimezone } from "@/lib/timezone";
import Link from "next/link";

interface LiveData {
  ok: boolean;
  isLive: boolean;
  isMuted?: boolean;
  title: string | null;
  lecturer: string | null;
  startedAt: string | null;
  streamUrl: string;
}

interface ScheduleItem {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  timezone?: string;
  durationMinutes: number;
  lecturer: string;
  topic: string;
}

interface ScheduleData {
  ok: boolean;
  items: ScheduleItem[];
}

interface RadioPlayerProps {
  initialData: LiveData;
  scheduleData: ScheduleData;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper to convert 24h time string to 12h format
function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function RadioPlayer({ initialData, scheduleData }: RadioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveData, setLiveData] = useState<LiveData>(initialData);
  const [volume, setVolume] = useState(80);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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
                  isMuted: data.isMuted,
                  title: data.title,
                  lecturer: data.lecturer,
                  startedAt: data.startedAt,
                  streamUrl: data.streamUrl
                });
                break;
                
              case 'broadcast_stop':
                console.log('📡 Received broadcast stop notification');
                setLiveData({
                  ok: true,
                  isLive: data.isLive,
                  isMuted: data.isMuted,
                  title: data.title,
                  lecturer: data.lecturer,
                  startedAt: data.startedAt,
                  streamUrl: data.streamUrl
                });
                break;
                
              case 'broadcast_mute':
              case 'broadcast_unmute':
                console.log(`📡 Received ${data.action} notification`);
                setLiveData(prev => ({
                  ...prev,
                  isMuted: data.isMuted
                }));
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
  }, []);

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((error) => {
          console.error('Error playing audio:', error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatStartTime = (startedAt: string | null) => {
    if (!startedAt) return null;
    
    const date = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `Started ${diffMins} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `Started ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
  };

  const today = new Date().getDay();
  const todaySchedule = scheduleData.items.filter(item => item.dayOfWeek === today);
  const upcomingSchedule = scheduleData.items.filter(item => {
    if (item.dayOfWeek === today) return false;
    const daysUntil = (item.dayOfWeek - today + 7) % 7;
    return daysUntil > 0 && daysUntil <= 3;
  });

  // Group all schedules by day for weekly view
  const weeklySchedule = DAYS.map((dayName, dayIndex) => ({
    day: dayName,
    dayIndex,
    items: scheduleData.items.filter(item => item.dayOfWeek === dayIndex),
  })).filter(day => day.items.length > 0);

  // Get user timezone for display
  const userTimezone = getUserTimezone();
  const showTimezoneInfo = true; // Always show timezone info for clarity

  // Find next scheduled program
  const getNextProgram = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Check today's remaining programs
    const todayRemaining = todaySchedule.filter(item => item.startTime > currentTime);
    if (todayRemaining.length > 0) {
      return { ...todayRemaining[0], isToday: true };
    }
    
    // Check upcoming days
    if (upcomingSchedule.length > 0) {
      return { ...upcomingSchedule[0], isToday: false };
    }
    
    return null;
  };

  const nextProgram = getNextProgram();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation */}
        <div className="flex items-center gap-6 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Home</span>
          </Link>
          
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors group"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="font-medium">📚 Audio Library</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Player Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              {/* Header with Live Status */}
              <div className={`p-8 ${liveData.isLive ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'}`}>
                {liveData.isLive ? (
                  // LIVE STATE - Show broadcast info
                  <>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                      <div className="flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 bg-white/20">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <span className="text-sm font-bold text-white">LIVE NOW</span>
                      </div>
                      
                      {/* Volume Control */}
                      <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="w-24 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <span className="text-sm font-medium text-white w-8">{volume}%</span>
                      </div>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2">
                      {liveData.title || "Live Lecture"}
                    </h1>
                    {liveData.lecturer && (
                      <p className="text-white/90 text-lg mb-2">
                        with {liveData.lecturer}
                      </p>
                    )}
                    {liveData.startedAt && (
                      <p className="text-white/80 text-sm">
                        {formatStartTime(liveData.startedAt)}
                      </p>
                    )}
                  </>
                ) : (
                  // OFFLINE STATE - Show welcoming message
                  <>
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                        <span className="text-white/90 text-sm font-medium">Al-Manhaj Radio</span>
                      </div>
                      
                      {/* Volume Control */}
                      <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="w-24 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <span className="text-sm font-medium text-white w-8">{volume}%</span>
                      </div>
                    </div>

                    <div className="text-center py-4">
                      <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        As-salamu alaykum! 👋
                      </h1>
                      <p className="text-white/90 text-lg mb-2">
                        Welcome to Al-Manhaj Radio
                      </p>
                      <p className="text-white/80 text-base">
                        We're currently between programs
                      </p>
                    </div>

                    {/* Next Program Info */}
                    {nextProgram && (
                      <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-white/70 text-sm mb-1">
                              {nextProgram.isToday ? "Coming up today" : `Coming up ${DAYS[nextProgram.dayOfWeek]}`}
                            </p>
                            <h3 className="text-white font-bold text-lg mb-1">
                              {nextProgram.topic}
                            </h3>
                            <p className="text-white/80 text-sm mb-2">
                              with {nextProgram.lecturer}
                            </p>
                            <div className="flex items-center gap-2 text-white">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold">{convertTimezoneToLocal(nextProgram.startTime, nextProgram.timezone || "Africa/Lagos")}</span>
                              <span className="text-white/70">• {nextProgram.durationMinutes} minutes</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Player Controls */}
              <div className="p-8 bg-gradient-to-br from-slate-50 to-white">
                {liveData.isLive ? (
                  // LIVE - Show play button
                  <div className="flex flex-col items-center">
                    {/* Play/Pause Button */}
                    <button
                      onClick={handlePlayPause}
                      className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                        isPlaying
                          ? "bg-gradient-to-br from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 scale-110"
                          : "bg-gradient-to-br from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 hover:scale-110"
                      } text-white group`}
                    >
                      {isPlaying ? (
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    <audio
                      ref={audioRef}
                      src={liveData.streamUrl}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onError={() => {
                        setIsPlaying(false);
                        console.error("Audio stream error");
                      }}
                      preload="metadata"
                      crossOrigin="anonymous"
                      playsInline={true}
                    />

                    <p className="mt-6 text-lg font-semibold text-slate-700">
                      {isPlaying ? "Now Playing Live" : "Click to Listen Live"}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      High Quality Audio Stream
                    </p>

                    {/* Waveform Animation */}
                    {isPlaying && (
                      <div className="flex items-center gap-1 mt-6">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-emerald-500 to-teal-500 rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 24 + 8}px`,
                              animationDelay: `${i * 0.1}s`,
                              animationDuration: '0.8s'
                            }}
                          ></div>
                        ))}
                      </div>
                    )}
                  </div>

                ) : (
                  // OFFLINE - Show message, no play button
                  <div className="flex flex-col items-center py-8">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-slate-700 mb-2">
                      No Live Broadcast
                    </p>
                    <p className="text-sm text-slate-500 text-center max-w-md mb-4">
                      We're currently offline. Check the schedule below for our next live program.
                    </p>
                    
                    {/* Check Live Status Button */}
                    <button
                      onClick={() => checkLiveState(true)}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg transition-all disabled:opacity-50 font-semibold"
                      title="Check now (auto-updates every 10 seconds)"
                    >
                      <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>
                        {isRefreshing ? 'Checking...' : 'Check Now'}
                      </span>
                    </button>
                    
                    <p className="text-xs text-slate-400 mt-3 text-center">
                      💡 Tip: If you were listening and the broadcast stopped, the presenter may have paused or ended the session
                    </p>
                  </div>
                )}

                {/* Info Message */}
                {liveData.isLive ? (
                  <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm text-emerald-800 text-center">
                      🎙️ You are listening to a live broadcast. May Allah bless you and increase you in knowledge.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 space-y-4">
                    {/* When to return message */}
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="font-semibold text-emerald-900 mb-2">
                            {nextProgram 
                              ? nextProgram.isToday 
                                ? `Join us live at ${convertTimezoneToLocal(nextProgram.startTime, nextProgram.timezone || "Africa/Lagos")} today`
                                : `Join us live ${DAYS[nextProgram.dayOfWeek]} at ${convertTimezoneToLocal(nextProgram.startTime, nextProgram.timezone || "Africa/Lagos")}`
                              : todaySchedule.length > 0
                                ? "Check today's schedule below for live programs"
                                : "Check our schedule for upcoming live programs"}
                          </h4>
                          <p className="text-sm text-emerald-700">
                            The radio stream is only available during live broadcasts.
                          </p>
                        </div>
                      </div>
                    </div>
                   
                  </div>
                )}

                {/* Real-time updates info */}
                <p className="text-center text-xs text-slate-400 mt-4">
                  ✨ Real-time updates • Click "Check Now" for manual refresh
                </p>
              </div>
            </div>

            {/* Timezone Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Timezone Information</h3>
                  <p className="text-sm text-blue-800">
                    Times shown in your timezone: <span className="font-medium">{getUserTimezoneDisplay()}</span>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Schedule times are automatically converted to your local time
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Schedule */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Today's Schedule
                </h2>
              </div>

              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((item) => {
                    const localTime = convertTimezoneToLocal(item.startTime, item.timezone || "Africa/Lagos");
                    return (
                      <div
                        key={item._id}
                        className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="text-lg font-bold text-emerald-600">
                              {localTime}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {item.durationMinutes} min
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1">
                              {item.topic}
                            </h3>
                            <p className="text-xs text-slate-600">
                              {item.lecturer}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500 text-sm">
                    No scheduled programs for today
                  </p>
                </div>
              )}
            </div>

            {/* Upcoming Schedule */}
            {upcomingSchedule.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Upcoming
                  </h2>
                </div>

                <div className="space-y-3">
                  {upcomingSchedule.slice(0, 3).map((item) => {
                    const localTime = convertTimezoneToLocal(item.startTime, item.timezone || "Africa/Lagos");
                    return (
                      <div
                        key={item._id}
                        className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="text-xs font-semibold text-purple-600 mb-1">
                              {DAYS[item.dayOfWeek]}
                            </div>
                            <div className="text-base font-bold text-slate-900">
                              {localTime}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1">
                              {item.topic}
                            </h3>
                            <p className="text-xs text-slate-600">
                              {item.lecturer}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* This Week's Schedule */}
            {weeklySchedule.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    This Week's Schedule
                  </h2>
                </div>

                <div className="space-y-4">
                  {weeklySchedule.map((daySchedule) => (
                    <div key={daySchedule.dayIndex} className="border-l-4 border-amber-400 pl-4">
                      <h3 className={`font-bold text-sm mb-2 ${
                        daySchedule.dayIndex === today 
                          ? 'text-emerald-600' 
                          : 'text-slate-700'
                      }`}>
                        {daySchedule.day}
                        {daySchedule.dayIndex === today && (
                          <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </h3>
                      <div className="space-y-2">
                        {daySchedule.items.map((item) => {
                          const localTime = convertTimezoneToLocal(item.startTime, item.timezone || "Africa/Lagos");
                          return (
                            <div
                              key={item._id}
                              className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                  <div className="text-sm font-bold text-amber-700">
                                    {localTime}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {item.durationMinutes} min
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-slate-900 text-xs leading-tight mb-0.5">
                                    {item.topic}
                                  </h4>
                                  <p className="text-xs text-slate-600">
                                    {item.lecturer}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About Al-Manhaj Radio
              </h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Live Islamic lectures and programs</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Following the way of the Salaf</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>High quality audio streaming</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
