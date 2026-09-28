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
    <div className={`px-5 py-5 sm:px-8 sm:py-8 min-w-0 w-full ${liveData.isLive ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'}`}>
      {liveData.isLive ? (
        <>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3 min-w-0">
            <div className="flex items-center gap-2 backdrop-blur-sm rounded-full px-3 py-1.5 bg-white/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <span className="text-xs font-bold text-white tracking-wide">LIVE NOW</span>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12M8.464 8.464a5 5 0 000 7.072M4.929 4.929a10 10 0 000 14.142M19.071 4.929a10 10 0 010 14.142" />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-20 sm:w-24 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-medium text-white w-7 text-right">{volume}%</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 leading-tight break-words line-clamp-2 min-w-0">
            {liveData.title || "Live Lecture"}
          </h1>
          {liveData.lecturer && (
            <p className="text-white/90 text-sm sm:text-base mb-1 truncate min-w-0">
              with {liveData.lecturer}
            </p>
          )}
          {liveData.startedAt && (
            <p className="text-white/70 text-xs sm:text-sm">
              {formatStartTime(liveData.startedAt)}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <span className="text-white/80 text-xs font-medium">Al-Manhaj Radio</span>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12M8.464 8.464a5 5 0 000 7.072M4.929 4.929a10 10 0 000 14.142M19.071 4.929a10 10 0 010 14.142" />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-20 sm:w-24 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-medium text-white w-7 text-right">{volume}%</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-3xl font-bold text-white mb-2 leading-tight">
            Welcome to Al-Manhaj Radio
          </h1>
          <p className="text-white/85 text-sm sm:text-base mb-1">
            Islamic lectures and Quran recitations
          </p>
          <p className="text-white/65 text-xs">
            Currently offline — check the schedule below
          </p>
        </>
      )}
    </div>
  );
}
