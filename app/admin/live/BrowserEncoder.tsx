'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface BrowserEncoderProps {
  onStreamStart?: () => void;
  onStreamStop?: () => void;
  onError?: (error: string) => void;
  title?: string;
  lecturer?: string;
}

interface StreamConfig {
  sampleRate: number;
  channels: number;
  bitrate: number;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'error';

export default function BrowserEncoder({ onStreamStart, onStreamStop, onError, title, lecturer }: BrowserEncoderProps) {
  // State management
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [audioLevel, setAudioLevel] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs for audio processing
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stream configuration
  const streamConfig: StreamConfig = {
    sampleRate: 44100,
    channels: 1, // Mono for Islamic radio
    bitrate: 96
  };

  // Check browser support and existing session on mount
  useEffect(() => {
    const checkSupport = () => {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasWebSocket = typeof WebSocket !== 'undefined';
      const hasAudioContext = !!(window.AudioContext || (window as any).webkitAudioContext);
      
      const supported = hasGetUserMedia && hasWebSocket && hasAudioContext;
      setIsSupported(supported);
      
      if (!supported) {
        setErrorMessage('Your browser does not support audio streaming. Please use Chrome, Firefox, or Safari.');
      }
    };

    const checkExistingSession = async () => {
      try {
        const response = await fetch('/api/live');
        if (response.ok) {
          const data = await response.json();
          if (data.isLive) {
            // Check if this might be the current user's session
            const tokenResponse = await fetch('/api/admin/live/broadcast-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              const currentUserName = tokenData.user.name || tokenData.user.email;
              
              if (data.lecturer === currentUserName || data.lecturer === tokenData.user.email) {
                // This is likely the current user's session
                setConnectionState('error');
                setErrorMessage(`You have an active broadcast session. Click "Reconnect to Resume" to continue your broadcast.`);
                
                // Calculate elapsed time
                if (data.startedAt) {
                  const startTime = new Date(data.startedAt).getTime();
                  const elapsed = Math.floor((Date.now() - startTime) / 1000);
                  setStreamDuration(elapsed);
                  
                  // Start duration timer from current elapsed time
                  streamStartTimeRef.current = Date.now() - (elapsed * 1000);
                }
              } else {
                // Someone else is broadcasting
                setConnectionState('error');
                setErrorMessage(`${data.lecturer || 'Another presenter'} is currently live. Please wait for them to finish.`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
      }
    };

    checkSupport();
    checkExistingSession();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Clean up audio context
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAudioLevel(0);
    setStreamDuration(0);
  }, []);

  const getAuthToken = async (): Promise<string> => {
    try {
      const response = await fetch('/api/admin/live/broadcast-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get broadcast token');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      throw new Error('Authentication failed. Please refresh and try again.');
    }
  };

  const connectWebSocket = async (token: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const gatewayUrl = process.env.NEXT_PUBLIC_BROADCAST_GATEWAY_URL || 'ws://localhost:8080';
      const ws = new WebSocket(`${gatewayUrl}?token=${token}`);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('✅ Connected to broadcast gateway');
        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('❌ WebSocket error:', error);
        reject(new Error('Failed to connect to broadcast server'));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleGatewayMessage(data);
        } catch (error) {
          console.error('Error parsing gateway message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        if (connectionState === 'streaming') {
          setConnectionState('error');
          setErrorMessage('Connection lost during stream');
        }
      };
    });
  };

  const handleGatewayMessage = (data: any) => {
    console.log('📨 Gateway message:', data);

    switch (data.type) {
      case 'ready':
        setConnectionState('connected');
        break;

      case 'stream_started':
        setConnectionState('streaming');
        setMessage('');
        setErrorMessage('');
        onStreamStart?.();
        break;

      case 'stream_stopped':
        setConnectionState('connected');
        onStreamStop?.();
        break;

      case 'icecast_connected':
        console.log('✅ Connected to Icecast server');
        break;

      case 'stream_error':
      case 'error':
        setConnectionState('error');
        setErrorMessage(data.message || 'Stream error occurred');
        onError?.(data.message);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const setupAudioProcessing = async (): Promise<MediaStream> => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: streamConfig.sampleRate,
          channelCount: streamConfig.channels
        }
      });

      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: streamConfig.sampleRate
      });

      // Create audio nodes
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      // Configure analyser for level meter
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Connect audio graph
      source.connect(analyser);
      source.connect(processor);
      
      // Optional monitoring (admin can hear themselves when enabled)
      if (isMonitoring) {
        source.connect(audioContext.destination);
      }

      // Process audio data
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        
        // Send audio data to gateway
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const audioData = inputBuffer.getChannelData(0);
          
          // Convert Float32Array to ArrayBuffer for WebSocket
          const buffer = new Float32Array(audioData);
          wsRef.current.send(buffer.buffer);
        }

        // Update audio level meter (this should work regardless of destination connection)
        updateAudioLevel(analyser);
      };

      // Ensure the processor is connected to destination for processing to work
      // (This doesn't mean audio will be heard - that's controlled by the source connection)
      processor.connect(audioContext.destination);

      // Store references
      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      processorRef.current = processor;
      analyserRef.current = analyser;

      return stream;
    } catch (error) {
      console.error('❌ Audio setup error:', error);
      throw new Error('Could not access microphone. Please check permissions.');
    }
  };

  const updateAudioLevel = (analyser: AnalyserNode) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate RMS (Root Mean Square) for more accurate level detection
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const level = (rms / 255) * 100;
    
    setAudioLevel(level);
  };

  const startDurationTimer = () => {
    streamStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - streamStartTimeRef.current) / 1000);
      setStreamDuration(elapsed);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setStreamDuration(0);
  };

  const startBroadcast = async () => {
    if (!isSupported) {
      setErrorMessage('Browser not supported');
      return;
    }

    try {
      setConnectionState('connecting');
      setErrorMessage('');
      setMessage('');

      // Check if this is a reconnection to existing session
      const isReconnection = errorMessage.includes('active broadcast session');

      // Get authentication token
      const token = await getAuthToken();

      // Connect to gateway
      const ws = await connectWebSocket(token);
      wsRef.current = ws;

      // Setup audio processing
      await setupAudioProcessing();

      if (isReconnection) {
        // For reconnection, send reconnect message
        ws.send(JSON.stringify({
          type: 'reconnect_stream',
          config: {
            ...streamConfig,
            title: title || 'Live Lecture',
            lecturer: lecturer || 'Unknown'
          }
        }));
        
        // Continue duration timer from where it left off
        if (streamDuration > 0) {
          durationIntervalRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - streamStartTimeRef.current) / 1000);
            setStreamDuration(elapsed);
          }, 1000);
        }
      } else {
        // New broadcast
        ws.send(JSON.stringify({
          type: 'start_stream',
          config: {
            ...streamConfig,
            title: title || 'Live Lecture',
            lecturer: lecturer || 'Unknown'
          }
        }));
        
        startDurationTimer();
      }

    } catch (error) {
      console.error('❌ Start broadcast error:', error);
      setConnectionState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start broadcast');
      cleanup();
    }
  };

  const stopBroadcast = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop_stream' }));
    }

    stopDurationTimer();
    cleanup();
    setConnectionState('disconnected');
  };

  const forceStopBroadcast = async () => {
    try {
      // Force stop via API call
      const response = await fetch('/api/admin/live/force-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setConnectionState('disconnected');
        setErrorMessage('');
        setMessage('Broadcast forcefully stopped. You can start a new session.');
      } else {
        setErrorMessage('Failed to force stop broadcast. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Error stopping broadcast. Please try again.');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (): string => {
    switch (connectionState) {
      case 'streaming': return 'text-red-600';
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (): string => {
    switch (connectionState) {
      case 'streaming': return '🔴 LIVE';
      case 'connected': return '🟢 Ready';
      case 'connecting': return '🟡 Connecting...';
      case 'error': return '🔴 Error';
      default: return '⚪ Offline';
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Browser Not Supported</h3>
        <p className="text-red-700 mb-4">{errorMessage}</p>
        <p className="text-sm text-red-600">
          Please use a modern browser like Chrome, Firefox, or Safari to broadcast.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🎙️ Browser Broadcasting</h2>
        <div className={`text-lg font-semibold ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Audio Level Meter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Audio Level
          </label>
          
          {/* Monitoring Toggle */}
          <button
            onClick={() => {
              setIsMonitoring(!isMonitoring);
              // Update audio routing if currently streaming
              if (audioContextRef.current && mediaStreamRef.current) {
                const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                if (isMonitoring) {
                  // Disconnect monitoring
                  try { source.disconnect(audioContextRef.current.destination); } catch (e) {}
                } else {
                  // Connect monitoring
                  source.connect(audioContextRef.current.destination);
                }
              }
            }}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              isMonitoring 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
            title={isMonitoring ? "You can hear yourself (may cause echo)" : "Click to hear yourself while broadcasting"}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
            </svg>
            {isMonitoring ? 'Monitor ON' : 'Monitor OFF'}
          </button>
        </div>
        
        <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
            style={{ width: `${Math.min(audioLevel, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Silent</span>
          <span>Good</span>
          <span>Too Loud</span>
        </div>
      </div>

      {/* Stream Duration */}
      {connectionState === 'streaming' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stream Duration
          </label>
          <div className="text-2xl font-mono font-bold text-emerald-600">
            {formatDuration(streamDuration)}
          </div>
          {streamDuration > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {errorMessage.includes('active broadcast session') ? 'Reconnected to existing session' : 'Live since start'}
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Success Message */}
      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{message}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4">
        {connectionState === 'disconnected' ? (
          <button
            onClick={startBroadcast}
            disabled={!isSupported}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-lg hover:bg-emerald-700 transition-colors font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            🎙️ Start Broadcasting
          </button>
        ) : connectionState === 'error' && errorMessage.includes('active broadcast') ? (
          <div className="flex gap-2 flex-1">
            <button
              onClick={startBroadcast}
              disabled={!isSupported}
              className="flex-1 bg-emerald-600 text-white py-4 rounded-lg hover:bg-emerald-700 transition-colors font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              🔄 Reconnect to Resume
            </button>
            <button
              onClick={forceStopBroadcast}
              className="flex-1 bg-red-600 text-white py-4 rounded-lg hover:bg-red-700 transition-colors font-bold text-lg"
            >
              🛑 Force Stop
            </button>
          </div>
        ) : connectionState === 'error' ? (
          <button
            onClick={startBroadcast}
            disabled={!isSupported}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-lg hover:bg-emerald-700 transition-colors font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            🎙️ Try Again
          </button>
        ) : connectionState === 'streaming' ? (
          <button
            onClick={stopBroadcast}
            className="flex-1 bg-red-600 text-white py-4 rounded-lg hover:bg-red-700 transition-colors font-bold text-lg"
          >
            ⏹️ Stop Broadcasting
          </button>
        ) : (
          <button
            disabled
            className="flex-1 bg-gray-400 text-white py-4 rounded-lg font-bold text-lg cursor-not-allowed"
          >
            {connectionState === 'connecting' ? '🔄 Connecting...' : '⏳ Preparing...'}
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">How to broadcast:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Click "Start Broadcasting"</li>
          <li>Allow microphone access when prompted</li>
          <li>Speak into your microphone and watch the audio level</li>
          <li>Your voice will be live on the radio stream</li>
          <li>Click "Stop Broadcasting" when finished</li>
        </ol>
      </div>
    </div>
  );
}