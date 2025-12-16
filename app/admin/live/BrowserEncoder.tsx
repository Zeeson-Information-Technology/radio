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
  const [isFirefox, setIsFirefox] = useState(false);
  
  // Audio processing throttling
  const lastAudioSendRef = useRef<number>(0);

  // Refs for audio processing
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stream configuration - use browser's default sample rate to avoid conflicts
  const streamConfig: StreamConfig = {
    sampleRate: 44100, // Will be updated to match AudioContext
    channels: 1, // Mono for Islamic radio
    bitrate: 64 // Reduced for lower latency (matches gateway)
  };

  // Check browser support and existing session on mount
  useEffect(() => {
    const checkSupport = () => {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasWebSocket = typeof WebSocket !== 'undefined';
      const hasAudioContext = !!(window.AudioContext || (window as any).webkitAudioContext);
      
      // Detect Firefox for specific instructions
      const isFirefoxBrowser = navigator.userAgent.toLowerCase().includes('firefox');
      setIsFirefox(isFirefoxBrowser);
      
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
              const currentUserEmail = tokenData.user.email;
              
              // Check if the live session belongs to current user
              // Gateway stores lecturer as: user.name || user.email
              const isCurrentUserSession = 
                data.lecturer === currentUserName || 
                data.lecturer === currentUserEmail ||
                data.lecturer === tokenData.user.name;
              
              if (isCurrentUserSession) {
                // This is the current user's session
                console.log('🔄 Detected existing session for current user:', data.lecturer);
                
                // Session is live - just reconnect
                console.log('📄 Admin page reloaded during live broadcast - reconnecting');
                setConnectionState('streaming');
                setMessage(`Reconnected to live broadcast.`);
                
                // Reconnect to the existing broadcast
                try {
                  const token = await getAuthToken();
                  const ws = await connectWebSocket(token);
                  wsRef.current = ws;
                  
                  // Setup message handlers for the connection
                  ws.onmessage = (event) => {
                    try {
                      const data = JSON.parse(event.data);
                      handleGatewayMessage(data);
                    } catch (error) {
                      console.error('Error parsing gateway message:', error);
                    }
                  };
                } catch (error) {
                  console.error('Error reconnecting to broadcast:', error);
                  setConnectionState('error');
                  setErrorMessage(`You have an active broadcast session. Click "Start Broadcasting" to reconnect.`);
                }
                
                // Calculate elapsed time and start timer
                if (data.startedAt) {
                  const startTime = new Date(data.startedAt).getTime();
                  const elapsed = Math.floor((Date.now() - startTime) / 1000);
                  setStreamDuration(elapsed);
                  
                  // Start duration timer from current elapsed time
                  streamStartTimeRef.current = Date.now() - (elapsed * 1000);
                  
                  // Start the duration timer to continue counting
                  durationIntervalRef.current = setInterval(() => {
                    const currentElapsed = Math.floor((Date.now() - streamStartTimeRef.current) / 1000);
                    setStreamDuration(currentElapsed);
                  }, 1000);
                  
                  console.log(`📊 Session duration: ${elapsed} seconds - timer started`);
                }
              } else {
                // Someone else is broadcasting
                console.log('❌ Another user is broadcasting:', data.lecturer);
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
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
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

      // Optimize WebSocket for low latency
      ws.binaryType = 'arraybuffer'; // Faster than blob for binary data

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 5000); // Reduced from 10000 for faster failure detection

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('✅ Connected to broadcast gateway');
        
        // Send low-latency configuration
        ws.send(JSON.stringify({
          type: 'configure_latency',
          mode: 'ultra_low'
        }));
        
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
        setMessage('🎙️ Streaming started! You are now live.');
        setErrorMessage('');
        
        // Notify listeners of broadcast start
        fetch('/api/live/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            title: title || 'Live Lecture',
            lecturer: lecturer || 'Unknown'
          })
        }).catch(error => console.error('Failed to notify listeners:', error));
        
        onStreamStart?.();
        break;



      case 'stream_stopped':
        setConnectionState('connected');
        
        // Notify listeners of broadcast stop
        fetch('/api/live/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop' })
        }).catch(error => console.error('Failed to notify listeners:', error));
        
        onStreamStop?.();
        break;

      case 'icecast_connected':
        console.log('✅ Connected to Icecast server');
        break;

      case 'stream_error':
        console.error('Stream error from gateway:', data.message);
        // Only show transient errors briefly, don't persist them
        if (connectionState === 'streaming') {
          // Transient error during streaming - show but don't change state
          console.warn('⚠️ Transient stream error:', data.message);
          // Don't set error state - stream may recover
        } else {
          setConnectionState('error');
          setErrorMessage(data.message || 'Stream error occurred');
          onError?.(data.message);
        }
        break;

      case 'error':
        // Don't treat "Failed to process message" as a fatal error
        if (data.message === 'Failed to process message') {
          console.warn('⚠️ Audio processing warning:', data.message);
          // Don't change connection state or show error to user
          // The stream can continue working despite occasional processing errors
        } else {
          console.error('Gateway error:', data.message);
          setConnectionState('error');
          setErrorMessage(data.message || 'Stream error occurred');
          onError?.(data.message);
        }
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const setupAudioProcessing = async (): Promise<{ stream: MediaStream; actualConfig: StreamConfig }> => {
    try {
      // Firefox-compatible microphone access with fallback constraints
      let audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      // Try with advanced constraints first (Chrome/Edge) - but don't force sample rate
      try {
        audioConstraints = {
          ...audioConstraints,
          channelCount: streamConfig.channels
        };
      } catch (e) {
        // Firefox might not support these constraints, use basic ones
        console.log('Using basic audio constraints for Firefox compatibility');
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser. Please use Chrome, Firefox, or Edge.');
      }

      // Request microphone access with Firefox-compatible error handling
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      // Create audio context with browser's default sample rate to avoid conflicts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      console.log(`🎵 AudioContext created with sample rate: ${audioContext.sampleRate}Hz`);
      
      // Update stream config to match actual AudioContext sample rate
      const actualSampleRate = audioContext.sampleRate;
      console.log(`🎵 Using actual sample rate: ${actualSampleRate}Hz`);

      // Create audio nodes with low-latency settings
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const processor = audioContext.createScriptProcessor(1024, 1, 1); // Reduced from 4096 for lower latency
      const gainNode = audioContext.createGain();

      // Configure analyser for level meter
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Configure gain node for silent processing (needed for ScriptProcessor to work)
      gainNode.gain.value = 0; // Silent - no audio output

      // Connect audio graph
      source.connect(analyser);
      source.connect(processor);
      
      // Connect processor to silent gain node to destination (required for processing)
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Optional monitoring (admin can hear themselves when enabled)
      if (isMonitoring) {
        source.connect(audioContext.destination);
      }

      // Process audio data
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        
        // Send audio data to gateway (with throttling to prevent overwhelming)
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const now = Date.now();
            // Throttle to ~10ms intervals for lower latency (reduced from 20ms)
            if (now - lastAudioSendRef.current < 10) {
              return;
            }
            lastAudioSendRef.current = now;
            
            const audioData = inputBuffer.getChannelData(0);
            
            // Skip empty or invalid audio frames
            if (!audioData || audioData.length === 0) {
              return;
            }
            
            // Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767) for s16le format
            const int16Data = new Int16Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              // Handle NaN and Infinity values
              let sample = audioData[i];
              if (!isFinite(sample)) {
                sample = 0;
              }
              
              // Clamp to [-1, 1] and convert to 16-bit signed integer
              sample = Math.max(-1, Math.min(1, sample));
              int16Data[i] = Math.round(sample * 32767);
            }
            
            // Only send if we have valid data
            if (int16Data.length > 0) {
              wsRef.current.send(int16Data.buffer);
            }
          } catch (error) {
            console.error('Audio processing error:', error);
            // Don't stop streaming on audio processing errors
          }
        }

        // Update audio level meter
        updateAudioLevel(analyser);
      };

      // Store references
      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      processorRef.current = processor;
      analyserRef.current = analyser;
      sourceRef.current = source;
      gainNodeRef.current = gainNode;

      // Return stream and actual configuration
      const actualConfig: StreamConfig = {
        sampleRate: actualSampleRate,
        channels: streamConfig.channels,
        bitrate: streamConfig.bitrate
      };
      
      return { stream, actualConfig };
    } catch (error: any) {
      console.error('❌ Audio setup error:', error);
      
      // Firefox-specific error handling
      let errorMessage = 'Could not access microphone. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Permission denied. Please:\n' +
          '1. Click the microphone icon in the address bar\n' +
          '2. Select "Allow" for microphone access\n' +
          '3. Refresh the page and try again';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Microphone is being used by another application. Please close other apps using the microphone.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Microphone settings not supported. Trying with basic settings...';
        
        // Retry with minimal constraints for Firefox
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({
            audio: true // Most basic constraint
          });
          
          // If successful with basic constraints, continue with setup
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContextClass();
          
          const source = audioContext.createMediaStreamSource(basicStream);
          const analyser = audioContext.createAnalyser();
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          const gainNode = audioContext.createGain();
          
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          gainNode.gain.value = 0;
          
          source.connect(analyser);
          source.connect(processor);
          processor.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Store references
          mediaStreamRef.current = basicStream;
          audioContextRef.current = audioContext;
          sourceRef.current = source;
          analyserRef.current = analyser;
          processorRef.current = processor;
          gainNodeRef.current = gainNode;
          
          // Setup audio processing
          processor.onaudioprocess = (event) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const inputBuffer = event.inputBuffer.getChannelData(0);
              const outputBuffer = new Int16Array(inputBuffer.length);
              
              for (let i = 0; i < inputBuffer.length; i++) {
                outputBuffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
              }
              
              wsRef.current.send(outputBuffer.buffer);
            }
            
            // Update audio level
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(Math.round((average / 255) * 100));
          };
          
          // Return basic stream with actual AudioContext config
          const actualConfig: StreamConfig = {
            sampleRate: audioContext.sampleRate,
            channels: streamConfig.channels,
            bitrate: streamConfig.bitrate
          };
          
          return { stream: basicStream, actualConfig };
        } catch (retryError) {
          errorMessage += ' Basic microphone access also failed.';
        }
      } else if (error.name === 'SecurityError') {
        errorMessage += 'Security error. Please ensure you\'re using HTTPS or localhost.';
      } else {
        errorMessage += `Unexpected error: ${error.message}`;
      }
      
      throw new Error(errorMessage);
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

      // Setup audio processing and get actual configuration
      const { stream, actualConfig } = await setupAudioProcessing();

      if (isReconnection) {
        // For reconnection, send reconnect message with actual config
        console.log('🔄 Sending reconnect_stream message, duration:', streamDuration);
        ws.send(JSON.stringify({
          type: 'reconnect_stream',
          config: {
            ...actualConfig,
            title: title || 'Live Lecture',
            lecturer: lecturer || 'Unknown'
          }
        }));
        
        // Timer should already be running from session detection
        // Just ensure streamStartTimeRef is set correctly if not already set
        if (streamDuration > 0 && !durationIntervalRef.current) {
          console.log('⏱️ Starting duration timer for reconnection from', streamDuration, 'seconds');
          streamStartTimeRef.current = Date.now() - (streamDuration * 1000);
          durationIntervalRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - streamStartTimeRef.current) / 1000);
            setStreamDuration(elapsed);
          }, 1000);
        } else if (durationIntervalRef.current) {
          console.log('⏱️ Duration timer already running, continuing from', streamDuration, 'seconds');
        }
      } else {
        // New broadcast with actual configuration
        ws.send(JSON.stringify({
          type: 'start_stream',
          config: {
            ...actualConfig,
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
    <div className="bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 rounded-3xl shadow-2xl border-2 border-emerald-100/50 overflow-hidden">
      {/* Premium Header - Unified Emerald Theme */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 px-8 py-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Al-Manhaj Radio</h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30 mt-1">
                <span className="text-sm font-semibold text-white">{getStatusText()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Center Content Container */}
        <div className="max-w-2xl mx-auto">
          
          {/* Audio Level Meter - Premium Design */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h3 className="text-lg font-bold text-slate-800">Audio Level</h3>
              
              {/* Monitoring Toggle - Unified Theme */}
              <button
                onClick={() => {
                  if (sourceRef.current && audioContextRef.current) {
                    if (isMonitoring) {
                      try { 
                        sourceRef.current.disconnect(audioContextRef.current.destination); 
                      } catch (e) {
                        console.log('Already disconnected from destination');
                      }
                    } else {
                      try {
                        sourceRef.current.connect(audioContextRef.current.destination);
                      } catch (e) {
                        console.log('Could not connect to destination');
                      }
                    }
                  }
                  setIsMonitoring(!isMonitoring);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg ${
                  isMonitoring 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-200' 
                    : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 shadow-slate-200 hover:from-slate-200 hover:to-slate-300'
                }`}
                title={isMonitoring ? "You can hear yourself (may cause echo)" : "Click to hear yourself while broadcasting"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                </svg>
                Monitor {isMonitoring ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Premium Audio Level Bar - Unified Theme */}
            <div className="relative">
              <div className="w-full h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-300/50">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-100 shadow-lg"
                  style={{ width: `${Math.min(audioLevel, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-600 mt-3">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                  Silent
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                  Good
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  Too Loud
                </span>
              </div>
            </div>
          </div>

          {/* Stream Duration - Unified Emerald Theme */}
          {connectionState === 'streaming' && (
            <div className="mb-8 text-center">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border-2 border-emerald-200/50 shadow-lg">
                <h3 className="text-lg font-bold text-emerald-800 mb-3">Stream Duration</h3>
                <div className="text-4xl font-mono font-bold text-emerald-600 mb-2 tracking-wider">
                  {formatDuration(streamDuration)}
                </div>
                {streamDuration > 0 && (
                  <p className="text-sm text-emerald-700 font-medium">
                    {errorMessage.includes('active broadcast session') ? '🔄 Reconnected to existing session' : '🎙️ Live since start'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Message - Premium */}
          {errorMessage && (
            <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800 font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message - Unified Theme */}
          {message && (
            <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-emerald-800 font-medium">{message.replace('Browser streaming', 'Streaming')}</p>
              </div>
            </div>
          )}

          {/* Premium Control Buttons - Centered */}
          <div className="text-center">
            {connectionState === 'disconnected' ? (
              <button
                onClick={startBroadcast}
                disabled={!isSupported}
                className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-emerald-200 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Start Broadcasting
              </button>
            ) : connectionState === 'error' && errorMessage.includes('active broadcast') ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={startBroadcast}
                  disabled={!isSupported}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reconnect to Resume
                </button>
                <button
                  onClick={forceStopBroadcast}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl font-bold text-lg shadow-xl shadow-red-200 transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                  </svg>
                  Force Stop
                </button>
              </div>
            ) : connectionState === 'error' ? (
              <button
                onClick={startBroadcast}
                disabled={!isSupported}
                className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-emerald-200 transition-all duration-300 transform hover:scale-105"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            ) : connectionState === 'streaming' ? (
              <div className="text-center">
                {/* Stop Button */}
                <button
                  onClick={stopBroadcast}
                  className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-red-200 transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z"/>
                  </svg>
                  End Broadcast
                </button>
              </div>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-slate-400 to-slate-500 text-white rounded-2xl font-bold text-xl shadow-lg cursor-not-allowed"
              >
                <svg className={`w-8 h-8 ${connectionState === 'connecting' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {connectionState === 'connecting' ? 'Connecting...' : 'Preparing...'}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Premium Instructions - Unified Emerald Theme */}
      <div className="mt-8 mx-8 mb-8 p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200/50 rounded-2xl shadow-lg">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Broadcasting Guide
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <p className="font-semibold text-emerald-900">Start Broadcasting</p>
                <p className="text-sm text-emerald-700">Click the emerald button to begin</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <p className="font-semibold text-emerald-900">Allow Microphone</p>
                <p className="text-sm text-emerald-700">Grant permission when prompted</p>
                {isFirefox && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    <p className="font-medium mb-1">🦊 Firefox Users:</p>
                    <p>If permission fails, click the microphone icon in the address bar and select "Allow"</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <p className="font-semibold text-emerald-900">Monitor Audio Level</p>
                <p className="text-sm text-emerald-700">Keep the bar in the emerald/amber zone</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
              <div>
                <p className="font-semibold text-emerald-900">You're Live!</p>
                <p className="text-sm text-emerald-700">Your voice is now streaming on the radio</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">5</div>
              <div>
                <p className="font-semibold text-emerald-900">Pause or Stop</p>
                <p className="text-sm text-emerald-700">Use controls when finished</p>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium">💡 Tip: Use "Pause" for breaks, "Stop" to end completely</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}