"use client";

import { useState, useRef, useEffect } from "react";
import { convertUTCToLocal, getUserTimezoneDisplay } from "@/lib/timezone";
import Link from "next/link";

interface LiveData {
  ok: boolean;
  isLive: boolean;
  title: string | null;
  lecturer: string | null;
  startedAt: string | null;
  streamUrl: string;
}

interface ScheduleItem {
  _id: string;
  dayOfWeek: number;
  startTime: string;
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

export default function RadioPlayer({ initialData, scheduleData }: RadioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveData, setLiveData] = useState<LiveData>(initialData);
  const [volume, setVolume] = useState(80);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Poll for live state updates every 30 seconds
  useEffect(() => {
    const pollLiveState = async () => {
      try {
        const response = await fetch('/api/live');
        if (response.ok) {
          const data = await response.json();
          setLiveData(data);
        }
      } catch (error) {
        console.error('Error polling live state:', error);
      }
    };

    const interval = setInterval(pollLiveState, 30000);
    return () => clearInterval(interval);
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

  const userInNigeria = isUserInNigeria();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors mb-8 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Player Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              {/* Header with Live Status */}
              <div className={`p-8 ${liveData.isLive ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {liveData.isLive ? (
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <span className="text-sm font-bold text-white">LIVE NOW</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <span className="text-sm font-semibold text-white">24/7 STREAMING</span>
                      </div>
                    )}
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
                  {liveData.title || "Al-Manhaj Radio"}
                </h1>
                {liveData.lecturer && (
                  <p className="text-white/90 text-lg mb-2">
                    by {liveData.lecturer}
                  </p>
                )}
                {liveData.isLive && liveData.startedAt && (
                  <p className="text-white/80 text-sm">
                    {formatStartTime(liveData.startedAt)}
                  </p>
                )}
              </div>

              {/* Player Controls */}
              <div className="p-8 bg-gradient-to-br from-slate-50 to-white">
                <div className="flex flex-col items-center">
                  {/* Play/Pause Button */}
                  <button
                    onClick={handlePlayPause}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                      isPlaying
                        ? "bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 scale-110"
                        : "bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:scale-110"
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
                    preload="none"
                  />

                  <p className="mt-6 text-lg font-semibold text-slate-700">
                    {isPlaying ? "Now Playing" : "Click to Play"}
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

                {/* Info Message */}
                <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm text-emerald-800 text-center">
                    {liveData.isLive
                      ? "🎙️ You are listening to a live lecture. May Allah bless you."
                      : "📻 Currently playing recorded content. Check the schedule for live sessions."}
                  </p>
                </div>

                {/* Auto-refresh indicator */}
                <p className="text-center text-xs text-slate-400 mt-4">
                  Status updates automatically every 30 seconds
                </p>
              </div>
            </div>

            {/* Timezone Info */}
            {!userInNigeria && (
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
                      Schedule times are in Nigeria time (WAT, UTC+1)
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                    const localTime = convertWATToLocal(item.startTime);
                    return (
                      <div
                        key={item._id}
                        className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="text-lg font-bold text-emerald-600">
                              {userInNigeria ? item.startTime : localTime}
                            </div>
                            {!userInNigeria && (
                              <div className="text-xs text-emerald-600/70">
                                {item.startTime} WAT
                              </div>
                            )}
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
                    const localTime = convertWATToLocal(item.startTime);
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
                              {userInNigeria ? item.startTime : localTime}
                            </div>
                            {!userInNigeria && (
                              <div className="text-xs text-purple-600/70">
                                {item.startTime} WAT
                              </div>
                            )}
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

            {/* Quick Info */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About This Stream
              </h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>High quality audio streaming</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Available 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Authentic Islamic content</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
