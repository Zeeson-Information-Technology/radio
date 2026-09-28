'use client';

import { useState } from 'react';

export default function OfflinePage() {
  const [checking, setChecking] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    setStillOffline(false);

    try {
      // Probe the server with a small no-cache request to confirm connectivity
      await fetch('/', { method: 'HEAD', cache: 'no-store' });
      // If it resolves, we're back online — go to the home page
      window.location.href = '/';
    } catch {
      // Still offline
      setStillOffline(true);
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>

        {/* Brand */}
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Al-Manhaj Radio</h1>

        {/* Message */}
        <p className="text-slate-500 text-lg mb-2">You are offline</p>
        <p className="text-slate-400 text-sm mb-8">
          Check your internet connection and try again.
        </p>

        {/* Still offline feedback */}
        {stillOffline && (
          <p className="text-red-500 text-sm mb-4">
            Still no connection. Please check your internet and try again.
          </p>
        )}

        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={checking}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
        >
          {checking ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking...
            </>
          ) : (
            'Try Again'
          )}
        </button>
      </div>
    </div>
  );
}
