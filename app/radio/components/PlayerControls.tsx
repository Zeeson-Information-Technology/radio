'use client';

import { RefObject } from 'react';
import { LiveData } from '../types';

interface PlayerControlsProps {
  liveData: LiveData;
  isPlaying: boolean;
  isBuffering?: boolean;
  audioRef: RefObject<HTMLAudioElement>;
  onPlayPause: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function PlayerControls({ 
  liveData, 
  isPlaying, 
  isBuffering = false,
  audioRef, 
  onPlayPause, 
  onRefresh, 
  isRefreshing 
}: PlayerControlsProps) {
  if (!liveData.isLive) {
    return (
      <div className="px-5 py-6 sm:p-6 bg-slate-50">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 flex items-center justify-center mb-3 mx-auto">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>

          <h3 className="text-base sm:text-xl font-bold text-slate-800 mb-1">No Live Broadcast</h3>
          <p className="text-slate-500 text-xs sm:text-sm mb-4 max-w-xs">Currently offline. Check the schedule below for our next program.</p>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <div className="flex items-center gap-2">
              <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Checking...' : 'Check Now'}
            </div>
          </button>

          <p className="text-slate-400 text-xs mt-4">Auto-updates in real time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-5 sm:p-6 bg-slate-50">
      <div className="flex flex-col items-center justify-center">
        <audio ref={audioRef} preload="none" className="hidden" />

        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          disabled={(!liveData.isLive && !isPlaying) || isBuffering}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-200 transform active:scale-95 hover:scale-105 mb-3 mx-auto ${
            liveData.isLive || isPlaying
              ? isPlaying
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                : liveData.isMuted
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
              : 'bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed'
          }`}
        >
          {isBuffering ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : isPlaying ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Status Text */}
        <p className="text-sm sm:text-base font-semibold text-slate-700 text-center">
          {isBuffering
            ? "Connecting..."
            : isPlaying 
            ? liveData.isMuted 
              ? "Connected (Presenter on Break)" 
              : liveData.currentAudioFile 
                ? "Now Playing Audio" 
                : "Now Playing Live"
            : liveData.isMuted 
              ? "Tap to Connect (Muted)" 
              : "Tap to Listen Live"
          }
        </p>
        <p className="text-xs text-slate-400 mt-0.5 text-center">
          {isBuffering
            ? "Loading stream..."
            : liveData.isMuted 
            ? "Stream available" 
            : liveData.currentAudioFile 
              ? "Al-Manhaj Radio"
              : "High quality stream"
          }
        </p>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="mt-3 px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg font-medium transition-all text-xs disabled:opacity-50"
        >
          <div className="flex items-center gap-1.5">
            <svg className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </div>
        </button>
      </div>
    </div>
  );
}
