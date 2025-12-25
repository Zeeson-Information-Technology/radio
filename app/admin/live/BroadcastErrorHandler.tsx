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
  const [isRetrying, setIsRetrying] = useState(false);

  // Global error handler for broadcast-related errors
  useEffect(() => {
    const handleBroadcastError = (event: CustomEvent<BroadcastError>) => {
      const error = event.detail;
      setErrors(prev => [...prev.slice(-4), error]); // Keep last 5 errors
      
      // Auto-retry for recoverable errors
      if (error.recoverable && (!error.retryCount || error.retryCount < 3)) {
        setTimeout(() => {
          handleAutoRetry(error);
        }, Math.min(1000 * Math.pow(2, error.retryCount || 0), 10000)); // Exponential backoff, max 10s
      }
    };

    window.addEventListener('broadcast-error', handleBroadcastError as EventListener);
    
    return () => {
      window.removeEventListener('broadcast-error', handleBroadcastError as EventListener);
    };
  }, []);

  const handleAutoRetry = async (error: BroadcastError) => {
    setIsRetrying(true);
    
    try {
      switch (error.type) {
        case 'network':
          // Retry network operations
          await new Promise(resolve => setTimeout(resolve, 1000));
          onRetry?.();
          break;
          
        case 'audio_processing':
          // Reset audio context
          console.log('🔄 Attempting to recover from audio processing error');
          break;
          
        case 'gateway':
          // Reconnect to gateway
          console.log('🔄 Attempting to reconnect to gateway');
          onRetry?.();
          break;
          
        default:
          console.log('🔄 Generic retry attempt');
          onRetry?.();
      }
      
      // Remove error if retry was successful
      setErrors(prev => prev.filter(e => e.timestamp !== error.timestamp));
      
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      
      // Update error with increased retry count
      setErrors(prev => prev.map(e => 
        e.timestamp === error.timestamp 
          ? { ...e, retryCount: (e.retryCount || 0) + 1 }
          : e
      ));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleManualRetry = () => {
    setIsRetrying(true);
    onRetry?.();
    setTimeout(() => setIsRetrying(false), 2000);
  };

  const handleReset = () => {
    setErrors([]);
    onReset?.();
  };

  const dismissError = (timestamp: number) => {
    setErrors(prev => prev.filter(e => e.timestamp !== timestamp));
  };

  const getErrorIcon = (type: BroadcastError['type']) => {
    switch (type) {
      case 'audio_processing':
        return '🎤';
      case 'network':
        return '🌐';
      case 'permission':
        return '🔒';
      case 'feedback':
        return '📢';
      case 'injection':
        return '🎵';
      case 'gateway':
        return '🔌';
      default:
        return '⚠️';
    }
  };

  const getErrorColor = (type: BroadcastError['type']) => {
    switch (type) {
      case 'permission':
        return 'from-red-50 to-red-100 border-red-200 text-red-800';
      case 'feedback':
        return 'from-amber-50 to-amber-100 border-amber-200 text-amber-800';
      case 'network':
      case 'gateway':
        return 'from-blue-50 to-blue-100 border-blue-200 text-blue-800';
      default:
        return 'from-orange-50 to-orange-100 border-orange-200 text-orange-800';
    }
  };

  const getRecoveryInstructions = (error: BroadcastError): string => {
    switch (error.type) {
      case 'permission':
        return 'Grant microphone permission in your browser settings and refresh the page.';
      case 'feedback':
        return 'Turn off monitor mode or use headphones to prevent audio feedback.';
      case 'network':
        return 'Check your internet connection and try again.';
      case 'audio_processing':
        return 'Close other applications using your microphone and restart the broadcast.';
      case 'injection':
        return 'Try selecting a different audio file or refresh the audio library.';
      case 'gateway':
        return 'The broadcast server is temporarily unavailable. Please try again in a moment.';
      default:
        return 'Try refreshing the page or restarting your broadcast session.';
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {errors.map((error) => (
        <div
          key={error.timestamp}
          className={`p-4 bg-gradient-to-r ${getErrorColor(error.type)} rounded-2xl border-2 shadow-lg`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-2xl">{getErrorIcon(error.type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">Broadcast Error</h4>
                  {error.retryCount && error.retryCount > 0 && (
                    <span className="text-xs bg-white/50 px-2 py-1 rounded-full">
                      Retry {error.retryCount}/3
                    </span>
                  )}
                </div>
                <p className="text-sm mb-2">{error.message}</p>
                <p className="text-xs opacity-80 mb-3">
                  {getRecoveryInstructions(error)}
                </p>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {error.recoverable && (
                    <button
                      onClick={handleManualRetry}
                      disabled={isRetrying}
                      className="px-3 py-1.5 bg-white/70 hover:bg-white/90 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {isRetrying ? 'Retrying...' : 'Retry Now'}
                    </button>
                  )}
                  
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white/70 hover:bg-white/90 rounded-lg text-xs font-medium transition-all"
                  >
                    Reset Session
                  </button>
                  
                  <button
                    onClick={() => dismissError(error.timestamp)}
                    className="px-3 py-1.5 bg-white/70 hover:bg-white/90 rounded-lg text-xs font-medium transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility function to emit broadcast errors
export function emitBroadcastError(error: Omit<BroadcastError, 'timestamp'>) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('broadcast-error', {
      detail: {
        ...error,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
  }
}