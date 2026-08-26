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
  // Show offline state when not live
  if (!liveData.isLive) {
    return (
      <div className="p-6 bg-slate-50">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Offline Status */}
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Live Broadcast</h3>
            <p className="text-slate-600 mb-4">We're currently offline. Check the schedule below for our next live program.</p>
            
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
            >
              <div className="flex items-center gap-2">
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Checking...' : 'Check Now'}
              </div>
            </button>
          </div>

          <p className="text-slate-500 text-sm mt-4 text-center">The radio stream is only available during live broadcasts.</p>
          <p className="text-slate-400 text-xs mt-1 text-center">✨ Real-time updates • Click "Check Now" for manual refresh</p>
        </div>
      </div>
    );
  }

  // Show live controls when broadcasting
  return (
    <div className="p-6 bg-slate-50">
      <div className="flex flex-col items-center justify-center">
        {/* Audio Element - src is set imperatively on play to avoid CORS preflight */}
        <audio
          ref={audioRef}
          preload="none"
          className="hidden"
        />

        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          disabled={(!liveData.isLive && !isPlaying) || isBuffering}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-2xl transition-all duration-300 transform hover:scale-105 mb-4 mx-auto ${
            liveData.isLive || isPlaying
              ? isPlaying
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                : liveData.isMuted
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
              : 'bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed'
          }`}
          title={
            !liveData.isLive && !isPlaying
              ? "No live broadcast available"
              : isPlaying
              ? "Stop listening"
              : liveData.isMuted
              ? "Connect to stream (currently muted)"
              : "Start listening"
          }
        >
          {isBuffering ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Status Text */}
        <p className="mt-3 text-lg font-semibold text-slate-700 text-center">
          {isBuffering
            ? "Connecting to stream..."
            : isPlaying 
            ? liveData.isMuted 
              ? "Connected (Presenter on Break)" 
              : liveData.currentAudioFile 
                ? "Now Playing Audio" 
                : "Now Playing Live"
            : liveData.isMuted 
              ? "Connect to Stream (Currently Muted)" 
              : "Click to Listen Live"
          }
        </p>
        <p className="text-sm text-slate-500 mt-1 text-center">
          {isBuffering
            ? "Please wait, loading audio stream..."
            : liveData.isMuted 
            ? "Stream available but currently muted" 
            : liveData.currentAudioFile 
              ? "Al-Manhaj Radio Live Stream" 
              : "High Quality Audio Stream"
          }
        </p>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="mt-4 px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
        >
          <div className="flex items-center gap-2">
            <svg 
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </div>
        </button>
      </div>
    </div>
  );
}