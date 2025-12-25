'use client';

import { LiveData } from '../types';

interface PlayerHeaderProps {
  liveData: LiveData;
  volume: number;
  onVolumeChange: (volume: number) => void;
  formatStartTime: (startTime: string) => string;
}

export default function PlayerHeader({ 
  liveData, 
  volume, 
  onVolumeChange, 
  formatStartTime 
}: PlayerHeaderProps) {
  return (
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
                onChange={(e) => onVolumeChange(Number(e.target.value))}
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
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-24 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm font-medium text-white w-8">{volume}%</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to Al-Manhaj Radio
          </h1>
          <p className="text-white/90 text-lg mb-2">
            Islamic lectures and Quran recitations following the way of the Salaf
          </p>
          <p className="text-white/80 text-sm">
            Currently offline - Check the schedule below for upcoming programs
          </p>
        </>
      )}
    </div>
  );
}