'use client';

import { LiveData } from '../types';

interface StatusBannersProps {
  liveData: LiveData;
  formatStartTime: (startTime: string) => string;
}

export default function StatusBanners({ liveData, formatStartTime }: StatusBannersProps) {
  if (!liveData.isLive) return null;

  return (
    <div className="flex flex-col items-center">
      {/* Mute Status Banner */}
      {liveData.isMuted && (
        <div className="w-full mb-6 p-4 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-xl">
          <div className="flex items-center justify-center gap-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            <div className="text-center">
              <p className="text-amber-800 font-semibold">
                📢 Presenter Taking a Break
              </p>
              <p className="text-amber-700 text-sm mt-1">
                The broadcast is temporarily muted. Please stay connected - we'll be back shortly!
              </p>
              {liveData.mutedAt && (
                <p className="text-amber-600 text-xs mt-2">
                  Muted since {formatStartTime(liveData.mutedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audio Playback Status Banner */}
      {liveData.currentAudioFile && (
        <div className="w-full mb-6 p-4 bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 rounded-xl">
          <div className="flex items-center justify-center gap-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <div className="text-center">
              <p className="text-purple-800 font-semibold">
                🎵 Now Playing: {liveData.currentAudioFile.title}
              </p>
              <p className="text-purple-700 text-sm mt-1">
                Pre-recorded audio • Duration: {Math.floor(liveData.currentAudioFile.duration / 60)}:{(liveData.currentAudioFile.duration % 60).toString().padStart(2, '0')}
              </p>
              {liveData.currentAudioFile.startedAt && (
                <p className="text-purple-600 text-xs mt-2">
                  Started {formatStartTime(liveData.currentAudioFile.startedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}