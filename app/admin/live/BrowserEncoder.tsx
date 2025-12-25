'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import AudioMonitorManager from './AudioMonitorManager';
import AudioInjectionSystem from './AudioInjectionSystem';
import BroadcastControlPanel from './BroadcastControlPanel';
import BroadcastErrorHandler, { emitBroadcastError } from './BroadcastErrorHandler';
import PerformanceMonitor from './PerformanceMonitor';

// Performance utility: Debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}

interface BrowserEncoderProps {
  onStreamStart?: () => void;
  onStreamStop?: () => void;
  onError?: (error: string) => void;
  title?: string;
  lecturer?: string;
  admin?: any; // Add admin prop for BroadcastControlPanel
}

interface StreamConfig {
  sampleRate: number;
  channels: number;
  bitrate: number;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'error';

export default function BrowserEncoder({ onStreamStart, onStreamStop, onError, title, lecturer, admin }: BrowserEncoderProps) {
  // State management
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [audioLevel, setAudioLevel] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [feedbackWarning, setFeedbackWarning] = useState<string | null>(null);
  const [audioInjectionActive, setAudioInjectionActive] = useState(false);
  const [currentAudioFile, setCurrentAudioFile] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  

  
  // Performance optimization: Debounce audio level updates
  const debouncedSetAudioLevel = useCallback(
    debounce((level: number) => {
      setAudioLevel(level);
    }, 50), // Update at most every 50ms
    []
  );

  // Performance optimization: Memoized stream config
  const streamConfig: StreamConfig = useMemo(() => ({
    sampleRate: 44100,
    channels: 2,
    bitrate: 128000
  }), []);

  // Performance optimization: Cleanup function
  const cleanupResources = useCallback(() => {
    // Stop all audio processing
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Cleanup audio systems
    if (audioMonitorRef.current) {
      audioMonitorRef.current.cleanup();
      audioMonitorRef.current = null;
    }
    
    if (audioInjectionSystemRef.current) {
      audioInjectionSystemRef.current.cleanup();
      audioInjectionSystemRef.current = null;
    }

    // Clean up mixed stream resources
    if (mixedStreamProcessorRef.current) {
      mixedStreamProcessorRef.current.disconnect();
      mixedStreamProcessorRef.current = null;
    }

    if (mixedStreamSourceRef.current) {
      mixedStreamSourceRef.current.disconnect();
      mixedStreamSourceRef.current = null;
    }
    
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.stopMonitoring();
      performanceMonitorRef.current = null;
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Reset notification flags
    hasNotifiedStartRef.current = false;
    hasNotifiedStopRef.current = false;
  }, []);

  // Broadcast control handlers
  const handleMuteToggle = useCallback(async () => {
    try {
      const endpoint = isMuted ? '/api/admin/broadcast/unmute' : '/api/admin/broadcast/mute';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setIsMuted(result.isMuted);
        setMessage(result.message);
      } else {
        throw new Error('Failed to toggle mute');
      }
    } catch (error) {
      console.error('Mute toggle error:', error);
      setErrorMessage('Failed to toggle mute');
    }
  }, [isMuted]);

  const handleMonitorToggle = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/broadcast/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !isMonitoring }),
      });

      if (response.ok) {
        const result = await response.json();
        setIsMonitoring(result.isMonitoring);
        setMessage(result.message);
        
        // Update local audio monitor
        if (audioMonitorRef.current) {
          if (result.isMonitoring) {
            audioMonitorRef.current.enableMonitoring();
          } else {
            audioMonitorRef.current.disableMonitoring();
          }
        }
      } else {
        throw new Error('Failed to toggle monitoring');
      }
    } catch (error) {
      console.error('Monitor toggle error:', error);
      setErrorMessage('Failed to toggle monitoring');
    }
  }, [isMonitoring]);

  const handleAudioFilePlay = useCallback(async (fileId: string, fileName: string, duration: number) => {
    try {
      console.log(`🎵 Starting audio playback: ${fileName} (${duration}s)`);
      
      const response = await fetch('/api/admin/broadcast/audio/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, fileName, duration }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Server responded OK for audio play request');
        
        setAudioInjectionActive(true);
        setCurrentAudioFile(fileName);
        setPlaybackProgress(0);
        setPlaybackDuration(duration);
        setMessage(result.message);
        
        // Start local audio injection if available
        if (audioInjectionSystemRef.current) {
          console.log('🎵 AudioInjectionSystem available, getting audio URL...');
          
          // Get the actual audio URL from the play API
          const playResponse = await fetch(`/api/audio/play/${fileId}`);
          const playResult = await playResponse.json();
          
          if (playResponse.ok && playResult.success && playResult.data) {
            console.log('✅ Got audio URL:', playResult.data.audioUrl);
            
            const audioFile = {
              id: fileId,
              title: fileName,
              url: playResult.data.audioUrl,
              duration
            };
            
            console.log('🎵 Calling AudioInjectionSystem.playAudioFile...');
            await audioInjectionSystemRef.current.playAudioFile(audioFile);
            console.log('✅ AudioInjectionSystem.playAudioFile completed');
          } else {
            console.error('❌ Failed to get audio URL:', playResult);
            throw new Error('Failed to get audio URL for injection');
          }
        } else {
          console.error('❌ AudioInjectionSystem not available');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Server error for audio play request:', response.status, errorText);
        throw new Error('Failed to start audio playback');
      }
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setErrorMessage('Failed to start audio playback');
    }
  }, []);

  const handleAudioStop = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/broadcast/audio/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAudioInjectionActive(false);
        setCurrentAudioFile(null);
        setPlaybackProgress(0);
        setPlaybackDuration(0);
        setMessage(result.message);
        
        // Stop local audio injection if available
        if (audioInjectionSystemRef.current) {
          audioInjectionSystemRef.current.stopPlayback();
        }
      } else {
        throw new Error('Failed to stop audio playback');
      }
    } catch (error) {
      console.error('Audio stop error:', error);
      setErrorMessage('Failed to stop audio playback');
    }
  }, []);

  // Refs for audio processing
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioMonitorRef = useRef<AudioMonitorManager | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasNotifiedStartRef = useRef<boolean>(false);
  const hasNotifiedStopRef = useRef<boolean>(false);
  
  // Enhanced audio system refs
  const audioMonitorManagerRef = useRef<AudioMonitorManager | null>(null);
  const audioInjectionSystemRef = useRef<AudioInjectionSystem | null>(null);
  const mixedStreamProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mixedStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

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

    // Clear any pending response timeout
    if (wsRef.current && (wsRef.current as any).responseTimeout) {
      clearTimeout((wsRef.current as any).responseTimeout);
      (wsRef.current as any).responseTimeout = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Dispose of enhanced audio systems
    if (audioMonitorManagerRef.current) {
      audioMonitorManagerRef.current.cleanup();
      audioMonitorManagerRef.current = null;
    }

    if (audioInjectionSystemRef.current) {
      audioInjectionSystemRef.current.cleanup();
      audioInjectionSystemRef.current = null;
    }

    // Clean up mixed stream resources
    if (mixedStreamProcessorRef.current) {
      mixedStreamProcessorRef.current.disconnect();
      mixedStreamProcessorRef.current = null;
    }

    if (mixedStreamSourceRef.current) {
      mixedStreamSourceRef.current.disconnect();
      mixedStreamSourceRef.current = null;
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
    setIsMonitoring(false);
    setIsMuted(false);
    setFeedbackWarning(null);
    setAudioInjectionActive(false);
    setCurrentAudioFile(null);
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
        
        // Emit network error
        emitBroadcastError({
          type: 'network',
          message: 'Failed to connect to broadcast server',
          recoverable: true
        });
        
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
          
          // Emit gateway error
          emitBroadcastError({
            type: 'gateway',
            message: 'Connection lost during stream',
            recoverable: true
          });
        }
      };
    });
  };

  const handleGatewayMessage = (data: any) => {
    console.log('📨 Gateway message:', data);

    // Clear any pending response timeout when we get a message
    if (wsRef.current && (wsRef.current as any).responseTimeout) {
      clearTimeout((wsRef.current as any).responseTimeout);
      (wsRef.current as any).responseTimeout = null;
    }

    switch (data.type) {
      case 'ready':
        setConnectionState('connected');
        break;

      case 'stream_started':
        setConnectionState('streaming');
        setMessage('🎙️ Streaming started! You are now live.');
        setErrorMessage('');
        
        // Only notify listeners once per session
        if (!hasNotifiedStartRef.current) {
          hasNotifiedStartRef.current = true;
          hasNotifiedStopRef.current = false; // Reset stop flag
          
          fetch('/api/live/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'start',
              title: title || 'Live Lecture',
              lecturer: lecturer || 'Unknown'
            })
          }).catch(error => console.error('Failed to notify listeners:', error));
        }
        
        onStreamStart?.();
        break;



      case 'stream_stopped':
        setConnectionState('connected');
        
        // Only notify listeners once per stop
        if (!hasNotifiedStopRef.current) {
          hasNotifiedStopRef.current = true;
          hasNotifiedStartRef.current = false; // Reset start flag
          
          fetch('/api/live/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
          }).catch(error => console.error('Failed to notify listeners:', error));
        }
        
        onStreamStop?.();
        break;

      case 'icecast_connected':
        console.log('✅ Connected to Icecast server');
        break;

      case 'stream_error':
        // Reduce error logging to prevent spam
        if (data.message.includes('Stream connection lost')) {
          console.warn('⚠️ Connection instability detected - gateway is reconnecting');
          // Don't change state for connection recovery attempts
        } else {
          console.error('Stream error from gateway:', data.message);
          if (connectionState !== 'streaming') {
            setConnectionState('error');
            setErrorMessage(data.message || 'Stream error occurred');
            onError?.(data.message);
          }
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

      // Enhanced broadcast control message handlers
      case 'broadcast_muted':
        setIsMuted(true);
        setMessage('🔇 Broadcast muted - taking a break');
        break;

      case 'broadcast_unmuted':
        setIsMuted(false);
        setMessage('🔊 Broadcast resumed');
        break;

      case 'monitor_toggled':
        setIsMonitoring(data.isMonitoring);
        setMessage(`🎧 Monitor ${data.isMonitoring ? 'enabled' : 'disabled'}`);
        break;

      case 'audio_injection_started':
        setAudioInjectionActive(true);
        setCurrentAudioFile(data.audioFile?.title || 'Unknown');
        setMessage(`🎵 Playing: ${data.audioFile?.title || 'Audio file'}`);
        break;

      case 'audio_injection_stopped':
        setAudioInjectionActive(false);
        setCurrentAudioFile(null);
        setMessage('⏹️ Audio playback stopped');
        break;

      case 'mute_timeout_reminder':
        setMessage('⏰ Mute reminder: Your broadcast has been muted for over 5 minutes');
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const setupAudioProcessing = async (): Promise<{ stream: MediaStream; actualConfig: StreamConfig }> => {
    console.log('🎤 setupAudioProcessing called');
    try {
      // Firefox-compatible microphone access with fallback constraints
      let audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      console.log('🎤 Audio constraints:', audioConstraints);

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
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });
      console.log('✅ Microphone access granted');

      // Create audio context with browser's native sample rate
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      const actualSampleRate = audioContext.sampleRate;
      console.log(`🎵 AudioContext created with sample rate: ${actualSampleRate}Hz`);
      console.log(`🌐 Browser: ${navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}`);

      // Create audio nodes with low-latency settings
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const processor = audioContext.createScriptProcessor(4096, 1, 1); // Standard buffer size
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
        
        // Send audio data to gateway (continuous streaming - no throttling)
        // The dynamic audio switching will ensure we get the right source (microphone or mixed)
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const audioData = inputBuffer.getChannelData(0);
            
            // Skip only if completely empty buffer (but allow silence/quiet audio)
            if (!audioData || audioData.length === 0) {
              return;
            }
            
            // Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767) for s16le format
            // No resampling needed - gateway will handle the actual sample rate
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
            // Reduce error logging to prevent spam
            if (Math.random() < 0.01) { // Only log 1% of errors
              console.warn('Audio processing error (throttled):', error instanceof Error ? error.message : 'Unknown error');
            }
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

      // Initialize enhanced audio systems (Requirements 1.1, 1.2, 1.3, 3.2, 3.3, 3.4)
      try {
        // Initialize AudioMonitorManager
        audioMonitorManagerRef.current = new AudioMonitorManager((frequency, amplitude) => {
          // Feedback detection callback (Requirements 1.5)
          setFeedbackWarning(`Audio feedback detected at ${Math.round(frequency)}Hz. Consider turning off monitoring or adjusting microphone position.`);
          
          // Clear warning after 5 seconds
          setTimeout(() => {
            setFeedbackWarning(null);
          }, 5000);
        });
        
        await audioMonitorManagerRef.current.initialize(stream);
        
        // Initialize AudioInjectionSystem
        audioInjectionSystemRef.current = new AudioInjectionSystem(
          (progress: number, duration: number) => {
            // Update progress in UI
            setPlaybackProgress(progress);
            setPlaybackDuration(duration);
            console.log(`🎵 Audio progress update: ${progress.toFixed(1)}s / ${duration.toFixed(1)}s`);
          },
          () => {
            // Handle playback completion
            setAudioInjectionActive(false);
            setCurrentAudioFile(null);
            setPlaybackProgress(0);
            setPlaybackDuration(0);
            console.log('✅ Audio playback completed');
          },
          (muted: boolean) => {
            // Handle microphone mute state
            console.log(`🎤 Microphone ${muted ? 'muted' : 'unmuted'} for audio injection`);
          }
        );
        
        await audioInjectionSystemRef.current.initialize(stream);

        console.log('✅ Enhanced audio systems initialized');
        
        // CRITICAL FIX: Set up dynamic audio source switching
        // When audio injection is active, we need to switch from microphone to mixed stream
        const setupDynamicAudioSwitching = () => {
          console.log('🔧 Setting up dynamic audio source switching...');
          
          // Store original processor for restoration
          const originalProcessor = processorRef.current;
          const originalSource = sourceRef.current;
          
          // Function to switch to mixed stream
          const switchToMixedStream = () => {
            const mixedStream = audioInjectionSystemRef.current?.getMixedStream();
            if (!mixedStream || !audioContextRef.current || !originalProcessor) {
              console.warn('⚠️ Mixed stream or processor not available for switching');
              return false;
            }
            
            try {
              // Disconnect original source
              if (originalSource && originalProcessor) {
                originalSource.disconnect(originalProcessor);
              }
              
              // Create new source from mixed stream
              const mixedSource = audioContextRef.current.createMediaStreamSource(mixedStream);
              
              // Connect mixed source to the same processor
              mixedSource.connect(originalProcessor);
              
              console.log('✅ Switched to mixed stream for broadcast');
              return true;
            } catch (error) {
              console.error('❌ Failed to switch to mixed stream:', error);
              return false;
            }
          };
          
          // Function to switch back to microphone
          const switchToMicrophone = () => {
            if (!originalSource || !originalProcessor) {
              console.warn('⚠️ Original source not available for restoration');
              return;
            }
            
            try {
              // Reconnect original microphone source
              originalSource.connect(originalProcessor);
              console.log('✅ Switched back to microphone for broadcast');
            } catch (error) {
              console.error('❌ Failed to switch back to microphone:', error);
            }
          };
          
          // Monitor audio injection state and switch sources accordingly
          let wasPlaying = false;
          const checkAudioInjectionState = () => {
            const isPlaying = audioInjectionSystemRef.current?.isPlaying() || false;
            
            if (isPlaying && !wasPlaying) {
              // Audio injection started - switch to mixed stream
              console.log('🎵 Audio injection started - switching to mixed stream');
              switchToMixedStream();
            } else if (!isPlaying && wasPlaying) {
              // Audio injection stopped - switch back to microphone
              console.log('🎤 Audio injection stopped - switching back to microphone');
              switchToMicrophone();
            }
            
            wasPlaying = isPlaying;
          };
          
          // Check state every 100ms for responsive switching
          setInterval(checkAudioInjectionState, 100);
        };
        
        // Set up dynamic switching after a short delay
        setTimeout(setupDynamicAudioSwitching, 500);
        
      } catch (error) {
        console.error('⚠️ Failed to initialize enhanced audio systems:', error);
        // Continue without enhanced features
      }

      // Return stream and actual browser configuration
      const actualConfig: StreamConfig = {
        sampleRate: actualSampleRate, // Use browser's actual rate
        channels: streamConfig.channels,
        bitrate: streamConfig.bitrate
      };
      
      console.log(`📤 Sending audio config to gateway: ${actualSampleRate}Hz, ${streamConfig.channels}ch, ${streamConfig.bitrate}kbps`);
      
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
        
        // Emit permission error
        emitBroadcastError({
          type: 'permission',
          message: 'Microphone permission denied',
          recoverable: false
        });
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
            // The dynamic audio switching will handle source changes
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
          
          console.log(`📤 Sending audio config to gateway (Firefox fallback): ${audioContext.sampleRate}Hz`);
          
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

    // Track retry attempts
    const currentRetry = retryCount;
    setRetryCount(prev => prev + 1);
    setIsFirstAttempt(false);

    // Set up timeout for the entire broadcast initialization
    const initTimeout = setTimeout(() => {
      console.error('❌ Broadcast initialization timeout after 15 seconds');
      setConnectionState('error');
      setErrorMessage(`Broadcast initialization timed out${currentRetry > 0 ? ` (attempt ${currentRetry + 1})` : ''}. Please try again.`);
      cleanup();
    }, 15000); // 15 second timeout

    try {
      setConnectionState('connecting');
      setErrorMessage('');
      setMessage('Initializing broadcast...');
      
      console.log(`🎬 Starting broadcast process... (attempt ${currentRetry + 1})`);
      
      // Reset notification flags for new broadcast session
      hasNotifiedStartRef.current = false;
      hasNotifiedStopRef.current = false;

      // Check if this is a reconnection to existing session
      const isReconnection = errorMessage.includes('active broadcast session');

      // Step 1: Get authentication token with timeout
      console.log('🔑 Getting authentication token...');
      setMessage('Getting authentication...');
      
      const tokenPromise = getAuthToken();
      const tokenTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token request timeout')), 5000)
      );
      
      const token = await Promise.race([tokenPromise, tokenTimeout]) as string;
      console.log('✅ Token received');

      // Step 2: Setup audio processing first (this often fails on first try)
      console.log('🎤 Setting up audio processing...');
      setMessage('Setting up microphone...');
      
      const audioPromise = setupAudioProcessing();
      const audioTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Microphone setup timeout')), 8000)
      );
      
      const { stream, actualConfig } = await Promise.race([audioPromise, audioTimeout]) as { stream: MediaStream; actualConfig: StreamConfig };
      console.log('✅ Audio processing setup complete');

      // Step 3: Connect to gateway with timeout
      console.log('🔌 Connecting to WebSocket gateway...');
      setMessage('Connecting to broadcast server...');
      
      const wsPromise = connectWebSocket(token);
      const wsTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000)
      );
      
      const ws = await Promise.race([wsPromise, wsTimeout]) as WebSocket;
      wsRef.current = ws;
      console.log('✅ WebSocket connected');
      
      // Step 4: Wait for WebSocket to be fully ready with shorter timeout
      setMessage('Finalizing connection...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 100ms
      console.log('✅ WebSocket ready to send messages');

      // Step 5: Send appropriate message based on connection type
      if (isReconnection) {
        // For reconnection, send reconnect message with actual config
        console.log('🔄 Sending reconnect_stream message, duration:', streamDuration);
        setMessage('Reconnecting to existing broadcast...');
        
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
        console.log('📤 Sending start_stream message...');
        setMessage('Starting new broadcast...');
        
        const startMessage = {
          type: 'start_stream',
          config: {
            ...actualConfig,
            title: title || 'Live Lecture',
            lecturer: lecturer || 'Unknown'
          }
        };
        
        ws.send(JSON.stringify(startMessage));
        console.log('✅ start_stream message sent');
        
        startDurationTimer();
      }

      // Clear the timeout since we completed successfully
      clearTimeout(initTimeout);
      
      // Set a temporary message while waiting for gateway response
      setMessage('Waiting for broadcast server confirmation...');
      
      // Set up a backup timeout in case gateway doesn't respond
      const gatewayResponseTimeout = setTimeout(() => {
        if (connectionState === 'connecting') {
          console.warn('⚠️ Gateway response timeout - assuming success');
          setConnectionState('streaming');
          setMessage('🎙️ Broadcast started! (Gateway response delayed)');
        }
      }, 3000); // 3 second timeout for gateway response
      
      // Store timeout reference to clear it when we get a proper response
      (ws as any).responseTimeout = gatewayResponseTimeout;

      // Reset retry count on successful initialization
      setRetryCount(0);

    } catch (error) {
      // Clear the timeout on error
      clearTimeout(initTimeout);
      
      console.error(`❌ Start broadcast error (attempt ${currentRetry + 1}):`, error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      setConnectionState('error');
      
      // Provide more specific error messages
      let errorMsg = 'Failed to start broadcast';
      if (error instanceof Error) {
        if (error.message.includes('Token request timeout')) {
          errorMsg = 'Authentication timeout. Please check your connection and try again.';
        } else if (error.message.includes('Microphone setup timeout')) {
          errorMsg = 'Microphone setup failed. Please check permissions and try again.';
        } else if (error.message.includes('WebSocket connection timeout')) {
          errorMsg = 'Could not connect to broadcast server. Please check your connection.';
        } else if (error.message.includes('timeout')) {
          errorMsg = 'Connection timeout. Please try again.';
        } else {
          errorMsg = error.message;
        }
      }
      
      // Add retry suggestion for first attempts
      if (currentRetry === 0) {
        errorMsg += ' This sometimes happens on the first attempt - please try again.';
      }
      
      setErrorMessage(errorMsg);
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
      console.log('🛑 Force stopping broadcast session...');
      
      // First try the force stop API
      const response = await fetch('/api/admin/live/force-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log('✅ Force stop successful');
        cleanup();
        setConnectionState('disconnected');
        setErrorMessage('');
        setMessage('Session reset. You can start a new broadcast.');
      } else {
        console.log('⚠️ Force stop API failed, trying direct reset...');
        
        // If force stop fails, try direct database reset
        const resetResponse = await fetch('/api/live/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'stop',
            force: true 
          })
        });
        
        if (resetResponse.ok) {
          console.log('✅ Database reset successful');
          cleanup();
          setConnectionState('disconnected');
          setErrorMessage('');
          setMessage('Database reset. You can start a new broadcast.');
        } else {
          setErrorMessage('Failed to reset session. Please contact support.');
        }
      }
    } catch (error) {
      console.error('❌ Force stop error:', error);
      setErrorMessage('Error resetting session. Please try again.');
    }
  };

  // Enhanced audio control functions
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
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
    <>
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
                onClick={handleMonitorToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg ${
                  isMonitoring 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-200' 
                    : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 shadow-slate-200 hover:from-slate-200 hover:to-slate-300'
                }`}
                title={isMonitoring 
                  ? "You can hear yourself (may cause echo/feedback)" 
                  : "Click to hear yourself while broadcasting"
                }
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

          {/* Feedback Warning - Enhanced Audio Feature */}
          {feedbackWarning && (
            <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-amber-800 font-semibold">Audio Feedback Detected</p>
                  <p className="text-amber-700 text-sm">{feedbackWarning}</p>
                </div>
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

    {/* Enhanced Broadcast Control Panel - Always shown for admins for audio library access */}
    {admin && (
      <BroadcastControlPanel
        admin={admin}
        isStreaming={connectionState === 'streaming'}
        isMuted={isMuted}
        isMonitoring={isMonitoring}
        audioInjectionActive={audioInjectionActive}
        currentAudioFile={currentAudioFile}
        feedbackWarning={feedbackWarning}
        playbackProgress={playbackProgress}
        playbackDuration={playbackDuration}
        onMuteToggle={handleMuteToggle}
        onMonitorToggle={handleMonitorToggle}
        onAudioFilePlay={handleAudioFilePlay}
        onAudioStop={handleAudioStop}
      />
    )}

    {/* Broadcast Error Handler */}
    <BroadcastErrorHandler
      onRetry={startBroadcast}
      onReset={() => {
        cleanup();
        setConnectionState('disconnected');
        setErrorMessage('');
        setMessage('Session reset. You can start a new broadcast.');
      }}
    />
  </>
  );
}