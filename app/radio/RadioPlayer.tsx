"use client";

import { useState, useRef, useEffect } from "react";
import { convertWATToLocal, isUserInNigeria, getUserTimezoneDisplay } from "@/lib/timezone";

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

    // Poll every 30 seconds
    const interval = setInterval(pollLiveState, 30000);
    
    return () => clearInterval(interval);
  }, []);

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

  // Get today's day of week (0 = Sunday, 6 = Saturday)
  const today = new Date().getDay();
  
  // Filter schedule for today
  const todaySchedule = scheduleData.items.filter(item => item.dayOfWeek === today);
  
  // Get upcoming schedule (next 7 days)
  const upcomingSchedule = scheduleData.items.filter(item => {
    if (item.dayOfWeek === today) return false; // Exclude today
    // Show next few days
    const daysUntil = (item.dayOfWeek - today + 7) % 7;
    return daysUntil > 0 && daysUntil <= 3; // Next 3 days
  });

  // Check if user is in Nigeria
  const userInNigeria = isUserInNigeria();

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Islamic Radio
          </h1>
          
          {/* Live Status Badge */}
          <div className="flex justify-center mb-6">
            {liveData.isLive ? (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                <span className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                LIVE NOW
              </span>
            ) : (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                OFFLINE - Playing Recordings
              </span>
            )}
          </div>

          {/* Current Content Info */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {liveData.title || "Islamic Radio"}
            </h2>
            {liveData.lecturer && (
              <p className="text-gray-600 mb-2">
                by {liveData.lecturer}
              </p>
            )}
            {liveData.isLive && liveData.startedAt && (
              <p className="text-sm text-gray-500">
                {formatStartTime(liveData.startedAt)}
              </p>
            )}
          </div>

          {/* Audio Player Controls */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handlePlayPause}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isPlaying
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } text-white shadow-lg`}
            >
              {isPlaying ? (
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
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

            <p className="text-sm text-gray-500">
              {isPlaying ? "Now Playing" : "Click to Play"}
            </p>
            
            {/* Stream URL info for debugging */}
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-gray-400 mt-2">
                Stream: {liveData.streamUrl}
              </p>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-600">
            {liveData.isLive
              ? "You are listening to a live lecture. May Allah bless you."
              : "Currently playing recorded content. Check back later for live lectures."}
          </p>
          
          {/* Auto-refresh indicator */}
          <p className="text-center text-xs text-gray-400 mt-2">
            Status updates automatically every 30 seconds
          </p>
        </div>

        {/* Timezone Indicator */}
        {!userInNigeria && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-600">
              ⏰ Times shown in your timezone: <span className="font-medium">{getUserTimezoneDisplay()}</span>
              <br />
              <span className="text-gray-500">Schedule times are in Nigeria time (WAT, UTC+1)</span>
            </p>
          </div>
        )}

        {/* Today's Schedule */}
        {todaySchedule.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Today's Schedule
            </h3>
            <div className="space-y-3">
              {todaySchedule.map((item) => {
                const localTime = convertWATToLocal(item.startTime);
                return (
                  <div
                    key={item._id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <div className="text-lg font-semibold text-green-600">
                        {userInNigeria ? item.startTime : localTime}
                      </div>
                      {!userInNigeria && (
                        <div className="text-xs text-gray-500">
                          {item.startTime} WAT
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {item.durationMinutes} min
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.topic}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {item.lecturer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Schedule for Today */}
        {todaySchedule.length === 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Today's Schedule
            </h3>
            <p className="text-center text-gray-500 py-4">
              No scheduled programs for today.
            </p>
          </div>
        )}

        {/* Upcoming Schedule */}
        {upcomingSchedule.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Upcoming Schedule
            </h3>
            <div className="space-y-3">
              {upcomingSchedule.map((item) => {
                const localTime = convertWATToLocal(item.startTime);
                return (
                  <div
                    key={item._id}
                    className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <div className="text-sm font-semibold text-blue-600">
                        {DAYS[item.dayOfWeek]}
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {userInNigeria ? item.startTime : localTime}
                      </div>
                      {!userInNigeria && (
                        <div className="text-xs text-gray-500">
                          {item.startTime} WAT
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {item.durationMinutes} min
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.topic}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {item.lecturer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
