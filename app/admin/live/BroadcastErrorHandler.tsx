'use client';

import { useState, useEffect } from 'react';

interface BroadcastError {
  type: 'audio_processing' | 'network' | 'permission' | 'feedback' | 'injection' | 'gateway';
  message: string;
  timestamp: number;
  recoverable: boolean;
  retryCount?: number;
}

interface BroadcastErrorHandlerProps {
  onRetry?: () => void;
  onReset?: () => void;
}

export default function BroadcastErrorHandler({ onRetry, onReset }: BroadcastErrorHandlerProps) {
  const [errors, setErrors] = useState<BroadcastError[]>([]);

  useEffect(() => {
    const handleBroadcastError = (event: CustomEvent<BroadcastError>) => {
      const error = event.detail;
      setErrors(prev => [...prev.slice(-1), error]); // only keep latest error

      // Auto-retry recoverable errors silently — no user-visible countdown
      if (error.recoverable && (!error.retryCount || error.retryCount < 3)) {
        setTimeout(() => {
          onRetry?.();
          setErrors(prev => prev.filter(e => e.timestamp !== error.timestamp));
        }, Math.min(2000 * Math.pow(2, error.retryCount || 0), 15000));
      }
    };

    window.addEventListener('broadcast-error', handleBroadcastError as EventListener);
    return () => window.removeEventListener('broadcast-error', handleBroadcastError as EventListener);
  }, [onRetry]);

  if (errors.length === 0) return null;

  const error = errors[0];

  // Permission errors need user action — show a clear message
  if (error.type === 'permission') {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
        <p className="text-sm text-red-700">
          Microphone access denied — enable it in browser settings and reload.
        </p>
        <button
          onClick={() => setErrors([])}
          className="text-red-400 hover:text-red-600 flex-shrink-0 text-xs"
        >
          ✕
        </button>
      </div>
    );
  }

  // All other errors — minimal indicator, silent retry in background
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{error.message}</p>
      <div className="flex items-center gap-2 flex-shrink-0">
        {error.recoverable && (
          <button
            onClick={() => { onRetry?.(); setErrors([]); }}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Retry
          </button>
        )}
        <button
          onClick={() => { onReset?.(); setErrors([]); }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function emitBroadcastError(error: Omit<BroadcastError, 'timestamp'>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('broadcast-error', {
      detail: { ...error, timestamp: Date.now() }
    }));
  }
}
