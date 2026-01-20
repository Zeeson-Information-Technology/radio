/**
 * Broadcast Service for FFmpeg and streaming operations
 */

const { spawn } = require('child_process');
const config = require('../config');

// Import fetch for Node.js versions that don't have it built-in
let fetch;
try {
  fetch = globalThis.fetch;
} catch (e) {
  // Fallback for older Node.js versions
  fetch = require('node-fetch');
}

class BroadcastService {
  constructor(databaseService, audioStateManager = null) {
    this.databaseService = databaseService;
    this.audioStateManager = audioStateManager;
    this.ffmpegProcess = null;
    this.isStreaming = false;
    this.currentBroadcast = null;
    this.testStreamRoute = null; // Will be set by server.js
  }

  async startStreaming(ws, user, streamConfig = {}) {
    console.log(`🎙️ startStreaming called for ${user.email} with config:`, streamConfig);
    
    if (this.isStreaming) {
      console.log(`❌ Stream already active, rejecting request from ${user.email}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Stream already active'
      }));
      return;
    }

    // Add a small delay to ensure cleanup is complete
    if (this.ffmpegProcess) {
      console.log(`⚠️ Previous FFmpeg process still exists, waiting for cleanup...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.ffmpegProcess) {
        console.log(`❌ Previous FFmpeg process still running, force killing...`);
        try {
          this.ffmpegProcess.kill('SIGKILL');
          this.ffmpegProcess = null;
        } catch (error) {
          console.warn('Error force killing FFmpeg:', error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`🎙️ Starting stream for ${user.email}`);

    // Production audio config for Icecast compatibility
    const audioConfig = {
      sampleRate: 44100,  // Fixed sample rate for consistency
      channels: 1,        // Mono for radio broadcasting
      bitrate: 128        // Standard MP3 bitrate
    };

    // Update database - set live state
    await this.databaseService.updateLiveState({
      isLive: true,
      isMuted: false,
      title: streamConfig.title || 'Live Lecture',
      lecturer: user.name || user.email,
      startedAt: new Date(),
      currentAudioFile: null  // Clear any existing audio file state
    });

    // Notify all listeners that broadcast has started
    await this.notifyListeners({
      type: 'broadcast_start',
      message: 'Live broadcast has started',
      isLive: true,
      isMuted: false,
      title: streamConfig.title || 'Live Lecture',
      lecturer: user.name || user.email,
      startedAt: new Date().toISOString(),
      streamUrl: process.env.STREAM_URL || 'http://localhost:8080/test-stream'
    });

    this.startFFmpeg(ws, user, audioConfig);
  }

  async reconnectStreaming(ws, user, streamConfig = {}) {
    console.log(`🔄 Reconnecting stream for ${user.email}`);

    // Check database for existing session
    const liveState = await this.databaseService.getLiveState();
    const currentUserLecturer = user.name || user.email;

    // If already streaming and it's the same user, just acknowledge
    if (this.isStreaming && this.ffmpegProcess && liveState && liveState.lecturer === currentUserLecturer) {
      console.log(`✅ Stream already active for ${user.email}, acknowledging reconnection`);
      ws.send(JSON.stringify({
        type: 'stream_started',
        message: 'Reconnected to existing stream',
        config: {
          sampleRate: streamConfig.sampleRate || 22050,
          channels: streamConfig.channels || 1,
          bitrate: streamConfig.bitrate || 96
        }
      }));
      return;
    }

    // If database shows live session for this user but FFmpeg is not running, restart it
    if (liveState && liveState.isLive && liveState.lecturer === currentUserLecturer) {
      console.log(`🎙️ Restarting FFmpeg for ${user.email} (session recovery)`);
      
      const audioConfig = {
        sampleRate: streamConfig.sampleRate || 22050,
        channels: streamConfig.channels || 1,
        bitrate: streamConfig.bitrate || 96
      };

      // Don't update startedAt - keep original time
      await this.databaseService.updateLiveState({
        isLive: true,
        isMuted: false,
        title: streamConfig.title || liveState.title || 'Live Lecture',
        lecturer: user.name || user.email,
        startedAt: liveState.startedAt,
        currentAudioFile: null  // Clear any existing audio file state on reconnection
      });

      this.startFFmpeg(ws, user, audioConfig);
    } else if (liveState && liveState.isLive && liveState.lecturer !== currentUserLecturer) {
      // Someone else is live
      ws.send(JSON.stringify({
        type: 'error',
        message: `Another presenter (${liveState.lecturer}) is currently live.`
      }));
    } else {
      // No existing session, start new one
      console.log(`🎙️ No existing session found, starting new stream for ${user.email}`);
      this.startStreaming(ws, user, streamConfig);
    }
  }

  startFFmpeg(ws, user, audioConfig) {
    // Clean up old test stream files first
    this.cleanupOldTestFiles();
    
    // For local testing, check if we should output to file instead of Icecast
    const isLocalTesting = process.env.NODE_ENV === 'development' && config.ICECAST_HOST === 'localhost';
    
    let ffmpegArgs;
    
    if (isLocalTesting) {
      // Local testing: output to stdout for live streaming
      console.log('🧪 Local testing mode: outputting to stdout for live streaming');
      
      ffmpegArgs = [
        // Input: Raw PCM from browser
        '-f', 's16le',
        '-ar', audioConfig.sampleRate.toString(),
        '-ac', audioConfig.channels.toString(),
        '-i', 'pipe:0',
        
        // LOW LATENCY OPTIMIZATION: Minimize all buffering and delays
        '-flush_packets', '1',                    // Flush packets immediately
        '-fflags', '+genpts+igndts+flush_packets', // Enhanced flags for low latency
        '-avoid_negative_ts', 'make_zero',        // Handle timestamp issues
        '-max_delay', '0',                        // Minimize muxing delay
        '-muxdelay', '0',                         // No mux delay
        '-muxpreload', '0',                       // No preload buffer
        '-thread_queue_size', '1',                // Minimal thread queue
        '-probesize', '32',                       // Minimal probe size
        '-analyzeduration', '0',                  // No analysis delay
        
        // Audio encoding for optimal voice quality with low latency
        '-acodec', 'libmp3lame',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '1',
        '-f', 'mp3',
        // Simplified voice optimization filters (fixed syntax)
        '-af', 'highpass=f=80,lowpass=f=8000,volume=1.2',
        
        // Output to stdout for live streaming
        'pipe:1'
      ];
    } else {
      // Production: output to Icecast
      const icecastUrl = `icecast://source:${config.ICECAST_PASSWORD}@${config.ICECAST_HOST}:${config.ICECAST_PORT}${config.ICECAST_MOUNT}`;
      
      ffmpegArgs = [
        // Input: Raw PCM from browser
        '-f', 's16le',
        '-ar', audioConfig.sampleRate.toString(),
        '-ac', audioConfig.channels.toString(),
        '-i', 'pipe:0',
        
        // LOW LATENCY OPTIMIZATION: Minimize all buffering and delays
        '-flush_packets', '1',                    // Flush packets immediately
        '-fflags', '+genpts+igndts+flush_packets', // Enhanced flags for low latency
        '-avoid_negative_ts', 'make_zero',        // Handle timestamp issues
        '-max_delay', '0',                        // Minimize muxing delay
        '-muxdelay', '0',                         // No mux delay
        '-muxpreload', '0',                       // No preload buffer
        '-thread_queue_size', '1',                // Minimal thread queue
        '-probesize', '32',                       // Minimal probe size
        '-analyzeduration', '0',                  // No analysis delay
        
        // Audio encoding for Icecast compatibility with voice optimization and low latency
        '-acodec', 'libmp3lame',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '1',
        '-f', 'mp3',
        '-af', 'highpass=f=80,lowpass=f=8000,volume=1.2',
        
        // Icecast streaming parameters
        '-ice_name', 'Al-Manhaj Radio',
        '-ice_description', `Live from ${user.name || user.email}`,
        '-ice_genre', 'Islamic',
        '-ice_public', '1',
        
        // Output to Icecast
        icecastUrl
      ];
    }

    console.log('🔧 Starting FFmpeg with args:', ffmpegArgs.join(' '));

    this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Set a timeout to detect if FFmpeg fails to start
    const startupTimeout = setTimeout(() => {
      if (!this.isStreaming && this.ffmpegProcess) {
        console.error('❌ FFmpeg startup timeout - process failed to start within 5 seconds');
        
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'stream_error',
            message: 'FFmpeg startup timeout. Please check your audio settings and try again.'
          }));
        }
        
        // Kill the process if it's still running
        try {
          this.ffmpegProcess.kill('SIGTERM');
        } catch (error) {
          console.warn('Error killing FFmpeg process:', error.message);
        }
      }
    }, 5000);

    // Handle FFmpeg events
    this.ffmpegProcess.on('spawn', () => {
      console.log('✅ FFmpeg process started successfully');
      clearTimeout(startupTimeout); // Clear the timeout since FFmpeg started
      this.isStreaming = true;
      
      // For local testing, pipe FFmpeg output to live stream
      if (isLocalTesting && this.testStreamRoute && this.testStreamRoute.setLiveAudioData) {
        console.log('🔄 Setting up live audio streaming from FFmpeg stdout');
        
        this.ffmpegProcess.stdout.on('data', (chunk) => {
          // Send live audio data to test stream
          this.testStreamRoute.setLiveAudioData(chunk);
        });
        
        this.ffmpegProcess.stdout.on('end', () => {
          console.log('📻 FFmpeg stdout ended');
          if (this.testStreamRoute && this.testStreamRoute.stopLiveAudioStream) {
            this.testStreamRoute.stopLiveAudioStream();
          }
        });
      }
      
      ws.send(JSON.stringify({
        type: 'stream_started',
        message: 'Live stream active',
        config: audioConfig
      }));
    });

    this.ffmpegProcess.on('error', (error) => {
      console.error('❌ FFmpeg spawn error:', error);
      clearTimeout(startupTimeout); // Clear timeout since we got an error
      this.handleFFmpegError(ws, user, error);
    });

    this.ffmpegProcess.on('exit', (code, signal) => {
      console.log(`🔚 FFmpeg exited with code ${code}, signal ${signal}`);
      this.isStreaming = false;
      
      // If FFmpeg exits immediately after spawn, it means there was a startup error
      if (code !== 0 && code !== null) {
        console.error(`❌ FFmpeg failed to start properly (exit code: ${code})`);
        
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'stream_error',
            message: `FFmpeg failed to start (code ${code}). Please try again.`
          }));
        }
      }
      
      // Log specific error codes for debugging
      if (code === 234) {
        console.error('❌ FFmpeg error 234: Cannot connect to Icecast server');
        ws.send(JSON.stringify({
          type: 'stream_error',
          message: 'Cannot connect to streaming server. Please check Icecast configuration.'
        }));
      } else if (code === 1) {
        console.error('❌ FFmpeg error 1: General encoding error');
        ws.send(JSON.stringify({
          type: 'stream_error',
          message: 'Audio encoding error. Please try again.'
        }));
      } else if (code !== 0 && this.currentBroadcast) {
        console.error(`❌ FFmpeg unexpected exit with code ${code}`);
        ws.send(JSON.stringify({
          type: 'stream_error',
          message: `Stream error (code ${code}). Attempting to reconnect...`
        }));
        
        // Auto-restart if unexpected exit (but not for connection errors)
        if (code !== 234) {
          setTimeout(() => {
            if (this.currentBroadcast && this.currentBroadcast.ws === ws) {
              console.log('🔄 Attempting FFmpeg restart...');
              this.startFFmpeg(ws, user, audioConfig);
            }
          }, 3000);
        }
      }
    });

    // Log FFmpeg output
    this.ffmpegProcess.stdout.on('data', (data) => {
      console.log('FFmpeg stdout:', data.toString());
    });

    this.ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('FFmpeg stderr:', output);
      
      // Check for successful connection to Icecast
      if (output.includes('Stream #0:0') || output.includes('Opening')) {
        ws.send(JSON.stringify({
          type: 'icecast_connected',
          message: 'Successfully connected to Icecast server'
        }));
      }
      
      // Detect streaming issues that cause "stops and repeats"
      if (output.includes('Broken pipe') || output.includes('Connection reset')) {
        console.error('🚨 FFmpeg connection issue detected:', output);
        ws.send(JSON.stringify({
          type: 'stream_warning',
          message: 'Connection instability detected - attempting to stabilize'
        }));
      }
      
      // Detect buffer underruns
      if (output.includes('buffer underrun') || output.includes('dropping frame')) {
        console.warn('⚠️ Audio buffer issue:', output);
      }
    });
  }

  async stopStreaming(ws, user) {
    console.log(`🛑 Stopping stream for ${user.email}`);

    // Stop live audio stream
    if (this.testStreamRoute && this.testStreamRoute.stopLiveAudioStream) {
      this.testStreamRoute.stopLiveAudioStream();
    }

    // Validate user has permission to stop
    if (this.currentBroadcast && this.currentBroadcast.user.userId !== user.userId) {
      console.warn(`⚠️ User ${user.email} trying to stop stream owned by ${this.currentBroadcast.user.email}`);
      if (user.role !== 'super_admin') {
        if (ws) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'You can only stop your own broadcast'
          }));
        }
        return;
      }
    }

    // Kill FFmpeg process if it exists
    if (this.ffmpegProcess) {
      console.log(`🛑 Terminating FFmpeg process`);
      try {
        this.ffmpegProcess.kill('SIGTERM');
      } catch (error) {
        console.warn(`⚠️ Error killing FFmpeg:`, error.message);
      }
      this.ffmpegProcess = null;
    }

    // Reset streaming state
    this.isStreaming = false;

    // Clear any cleanup timeout
    if (this.currentBroadcast && this.currentBroadcast.cleanupTimeout) {
      clearTimeout(this.currentBroadcast.cleanupTimeout);
      this.currentBroadcast.cleanupTimeout = null;
    }

    // Update database - set completely offline state
    await this.databaseService.updateLiveState({
      isLive: false,
      isMuted: false,
      title: null,
      lecturer: null,
      startedAt: null,
      mutedAt: null,
      currentAudioFile: null  // Clear any existing audio file state
    });

    // Notify all listeners that broadcast has stopped
    await this.notifyListeners({
      type: 'broadcast_stop',
      message: 'Live broadcast has ended',
      isLive: false,
      isMuted: false,
      title: null,
      lecturer: null,
      startedAt: null,
      currentAudioFile: null
    });

    // Notify client of successful stop
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stream_stopped',
        message: 'Stream ended successfully'
      }));
    }

    // Clear the current broadcast session
    this.currentBroadcast = null;
    
    console.log(`✅ Stream stopped successfully for ${user.email}`);
  }

  handleFFmpegError(ws, user, error) {
    console.error('❌ FFmpeg process error:', error);
    
    this.isStreaming = false;
    
    if (ws) {
      ws.send(JSON.stringify({
        type: 'stream_error',
        message: 'Encoding error occurred. Please try again.',
        error: error.message
      }));
    }
  }

  restartFFmpeg(ws, user) {
    console.log('🔄 Restarting FFmpeg process...');
    
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
    }
    
    setTimeout(() => {
      if (this.currentBroadcast && this.currentBroadcast.ws === ws) {
        this.startFFmpeg(ws, user, { sampleRate: 22050, channels: 1, bitrate: 96 });
      }
    }, 1000);
  }

  handleAudioData(audioBuffer) {
    if (!this.isStreaming || !this.ffmpegProcess) {
      return;
    }

    try {
      // Check if FFmpeg stdin is writable before writing
      if (this.ffmpegProcess.stdin && this.ffmpegProcess.stdin.writable) {
        this.ffmpegProcess.stdin.write(audioBuffer);
      } else {
        console.warn('⚠️ FFmpeg stdin not writable, skipping audio data');
      }
    } catch (error) {
      console.error('❌ Error writing to ffmpeg:', error);
      
      // If write fails consistently, the stream may be broken
      if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
        console.error('🚨 FFmpeg pipe broken - stream may need restart');
      }
    }
  }

  setCurrentBroadcast(broadcast) {
    this.currentBroadcast = broadcast;
  }

  getCurrentBroadcast() {
    return this.currentBroadcast;
  }

  getStreamingStatus() {
    return {
      isStreaming: this.isStreaming,
      hasFFmpeg: !!this.ffmpegProcess,
      hasBroadcast: !!this.currentBroadcast
    };
  }

  // New broadcast control methods for live-broadcast-controls feature

  /**
   * Mute the broadcast - stop audio transmission while maintaining session
   * Requirements 2.1, 2.2, 2.3: Mute functionality with state management
   */
  async muteBroadcast(ws, user) {
    console.log(`🔇 Muting broadcast for ${user.email}`);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'mute')) {
      return;
    }

    try {
      // Update database state using AudioStateManager (Requirements 2.2, 2.3)
      const sessionId = this.currentBroadcast ? this.currentBroadcast.sessionId : null;
      const muteState = this.audioStateManager 
        ? await this.audioStateManager.updateMuteState(true, sessionId)
        : await this.databaseService.updateLiveState({
            isMuted: true,
            mutedAt: new Date()
          });

      // Update current broadcast state
      if (this.currentBroadcast) {
        this.currentBroadcast.isMuted = true;
        this.currentBroadcast.mutedAt = new Date();
      }

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'broadcast_muted',
          message: 'Broadcast muted successfully',
          mutedAt: new Date().toISOString()
        }));
      }

      // Notify all listeners (Requirements 2.4)
      await this.notifyListeners({
        type: 'broadcast_muted',
        message: 'The presenter is taking a break',
        mutedAt: new Date().toISOString()
      });

      // Set up mute timeout reminder (Requirements 2.7)
      this.setupMuteTimeoutReminder(ws, user);

      console.log(`✅ Broadcast muted for ${user.email}`);
    } catch (error) {
      console.error('❌ Error muting broadcast:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to mute broadcast'
        }));
      }
    }
  }

  /**
   * Unmute the broadcast - resume audio transmission
   * Requirements 2.5, 2.6: Unmute functionality with state restoration
   */
  async unmuteBroadcast(ws, user) {
    console.log(`🔊 Unmuting broadcast for ${user.email}`);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'unmute')) {
      return;
    }

    try {
      // Update database state using AudioStateManager (Requirements 2.5, 2.6)
      const sessionId = this.currentBroadcast ? this.currentBroadcast.sessionId : null;
      const unmuteState = this.audioStateManager 
        ? await this.audioStateManager.updateUnmuteState(sessionId)
        : await this.databaseService.updateLiveState({
            isMuted: false,
            mutedAt: null
          });

      // Update current broadcast state
      if (this.currentBroadcast) {
        this.currentBroadcast.isMuted = false;
        this.currentBroadcast.mutedAt = null;
        
        // Clear mute timeout reminder
        if (this.currentBroadcast.muteTimeoutReminder) {
          clearTimeout(this.currentBroadcast.muteTimeoutReminder);
          this.currentBroadcast.muteTimeoutReminder = null;
        }
      }

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'broadcast_unmuted',
          message: 'Broadcast resumed successfully'
        }));
      }

      // Notify all listeners (Requirements 2.6)
      await this.notifyListeners({
        type: 'broadcast_unmuted',
        message: 'The broadcast has resumed'
      });

      console.log(`✅ Broadcast unmuted for ${user.email}`);
    } catch (error) {
      console.error('❌ Error unmuting broadcast:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to unmute broadcast'
        }));
      }
    }
  }

  /**
   * Toggle monitor mode for the presenter
   * Requirements 1.2, 1.3, 1.4: Monitor control with status tracking
   */
  async toggleMonitor(ws, user, enabled) {
    console.log(`🎧 Toggling monitor for ${user.email}: ${enabled}`);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'monitor')) {
      return;
    }

    try {
      // Update database state using AudioStateManager
      const sessionId = this.currentBroadcast ? this.currentBroadcast.sessionId : null;
      const monitorState = this.audioStateManager 
        ? await this.audioStateManager.updateMonitorState(enabled, sessionId)
        : await this.databaseService.updateLiveState({
            isMonitoring: enabled
          });

      // Update current broadcast state
      if (this.currentBroadcast) {
        this.currentBroadcast.isMonitoring = enabled;
      }

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'monitor_toggled',
          message: `Monitor ${enabled ? 'enabled' : 'disabled'}`,
          isMonitoring: enabled
        }));
      }

      console.log(`✅ Monitor ${enabled ? 'enabled' : 'disabled'} for ${user.email}`);
    } catch (error) {
      console.error('❌ Error toggling monitor:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to toggle monitor'
        }));
      }
    }
  }

  /**
   * Inject pre-recorded audio into the broadcast
   * Requirements 3.1, 3.2, 3.7: Audio injection with status tracking
   */
  async injectAudio(ws, user, data) {
    console.log(`🎵 Injecting audio for ${user.email}:`, data.fileId);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'inject_audio')) {
      return;
    }

    try {
      const { fileId, fileName, duration } = data;

      // Update current broadcast state
      if (this.currentBroadcast) {
        this.currentBroadcast.currentAudioFile = {
          id: fileId,
          title: fileName,
          duration: duration,
          startedAt: new Date()
        };
      }

      // Update database state (in memory only, not persistent)
      await this.databaseService.updateLiveState({
        currentAudioFile: {
          id: fileId,
          title: fileName,
          duration: duration,
          startedAt: new Date()
        }
      });

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'audio_injection_started',
          message: `Playing: ${fileName}`,
          audioFile: {
            id: fileId,
            title: fileName,
            duration: duration,
            startedAt: new Date().toISOString()
          }
        }));
      }

      // Notify listeners (Requirements 3.7) - Professional radio messaging
      await this.notifyListeners({
        type: 'audio_playback_started',
        message: `♪ ${fileName}`, // Simple, clean message
        audioFile: {
          title: fileName,
          duration: duration
        }
      });

      console.log(`✅ Audio injection started for ${user.email}: ${fileName}`);
    } catch (error) {
      console.error('❌ Error injecting audio:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to inject audio'
        }));
      }
    }
  }

  /**
   * Stop audio injection
   * Requirements 3.4, 3.6: Stop audio injection and restore microphone
   */
  async stopAudioInjection(ws, user) {
    console.log(`⏹️ Stopping audio injection for ${user.email}`);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'stop_audio')) {
      return;
    }

    try {
      // Clear current audio file from broadcast state
      if (this.currentBroadcast) {
        this.currentBroadcast.currentAudioFile = null;
      }

      // Update database state
      await this.databaseService.updateLiveState({
        currentAudioFile: null
      });

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'audio_injection_stopped',
          message: 'Audio playback stopped'
        }));
      }

      // Notify listeners
      await this.notifyListeners({
        type: 'audio_playback_stopped',
        message: 'Audio playback ended'
      });

      console.log(`✅ Audio injection stopped for ${user.email}`);
    } catch (error) {
      console.error('❌ Error stopping audio injection:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to stop audio injection'
        }));
      }
    }
  }

  /**
   * Pause audio injection
   */
  async pauseAudioInjection(ws, user) {
    console.log(`⏸️ Pausing audio injection for ${user.email}`);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'pause_audio')) {
      return;
    }

    try {
      // Update current broadcast state
      if (this.currentBroadcast && this.currentBroadcast.currentAudioFile) {
        this.currentBroadcast.currentAudioFile.isPaused = true;
        this.currentBroadcast.currentAudioFile.pausedAt = new Date();
      }

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'audio_injection_paused',
          message: 'Audio playback paused'
        }));
      }

      // Notify listeners
      await this.notifyListeners({
        type: 'audio_playback_paused',
        message: 'Audio playback paused'
      });

      console.log(`✅ Audio injection paused for ${user.email}`);
    } catch (error) {
      console.error('❌ Error pausing audio injection:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to pause audio injection'
        }));
      }
    }
  }

  /**
   * Resume audio injection
   */
  async resumeAudioInjection(ws, user) {
    console.log(`▶️ Resuming audio injection for ${user.email}`);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'resume_audio')) {
      return;
    }

    try {
      // Update current broadcast state
      if (this.currentBroadcast && this.currentBroadcast.currentAudioFile) {
        this.currentBroadcast.currentAudioFile.isPaused = false;
        this.currentBroadcast.currentAudioFile.pausedAt = null;
      }

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'audio_injection_resumed',
          message: 'Audio playback resumed'
        }));
      }

      // Notify listeners
      await this.notifyListeners({
        type: 'audio_playback_resumed',
        message: 'Audio playback resumed'
      });

      console.log(`✅ Audio injection resumed for ${user.email}`);
    } catch (error) {
      console.error('❌ Error resuming audio injection:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to resume audio injection'
        }));
      }
    }
  }

  /**
   * Seek audio injection to specific time
   */
  async seekAudioInjection(ws, user, timeInSeconds) {
    console.log(`⏭️ Seeking audio injection for ${user.email} to ${timeInSeconds}s`);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'seek_audio')) {
      return;
    }

    try {
      // Update current broadcast state
      if (this.currentBroadcast && this.currentBroadcast.currentAudioFile) {
        this.currentBroadcast.currentAudioFile.currentTime = timeInSeconds;
        this.currentBroadcast.currentAudioFile.lastSeekAt = new Date();
      }

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'audio_injection_seeked',
          message: `Audio seeked to ${Math.floor(timeInSeconds)}s`,
          time: timeInSeconds
        }));
      }

      // Notify listeners
      await this.notifyListeners({
        type: 'audio_playback_seeked',
        message: `Audio seeked to ${Math.floor(timeInSeconds)}s`,
        time: timeInSeconds
      });

      console.log(`✅ Audio injection seeked for ${user.email} to ${timeInSeconds}s`);
    } catch (error) {
      console.error('❌ Error seeking audio injection:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to seek audio injection'
        }));
      }
    }
  }

  /**
   * Skip audio injection forward or backward
   */
  async skipAudioInjection(ws, user, seconds) {
    const direction = seconds > 0 ? 'forward' : 'backward';
    const absSeconds = Math.abs(seconds);
    console.log(`⏭️ Skipping audio injection ${direction} ${absSeconds}s for ${user.email}`);

    // Validate user has permission
    if (!this.validateBroadcastPermission(ws, user, 'skip_audio')) {
      return;
    }

    try {
      // Update current broadcast state
      if (this.currentBroadcast && this.currentBroadcast.currentAudioFile) {
        const currentTime = this.currentBroadcast.currentAudioFile.currentTime || 0;
        const duration = this.currentBroadcast.currentAudioFile.duration || 0;
        const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
        
        this.currentBroadcast.currentAudioFile.currentTime = newTime;
        this.currentBroadcast.currentAudioFile.lastSkipAt = new Date();
      }

      // Notify presenter
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'audio_injection_skipped',
          message: `Skipped ${direction} ${absSeconds}s`,
          seconds: seconds
        }));
      }

      // Notify listeners
      await this.notifyListeners({
        type: 'audio_playback_skipped',
        message: `Skipped ${direction} ${absSeconds}s`,
        seconds: seconds
      });

      console.log(`✅ Audio injection skipped ${direction} ${absSeconds}s for ${user.email}`);
    } catch (error) {
      console.error('❌ Error skipping audio injection:', error);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to skip audio injection'
        }));
      }
    }
  }

  /**
   * Validate user has permission to perform broadcast control action
   */
  validateBroadcastPermission(ws, user, action) {
    // Check if user has an active broadcast
    if (!this.currentBroadcast) {
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Cannot ${action}: No active broadcast session`
        }));
      }
      return false;
    }

    // Check if user owns the broadcast or is super admin
    if (this.currentBroadcast.user.userId !== user.userId && user.role !== 'super_admin') {
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Cannot ${action}: You can only control your own broadcast`
        }));
      }
      return false;
    }

    // Check if broadcast is live
    if (!this.isStreaming) {
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Cannot ${action}: Broadcast is not live`
        }));
      }
      return false;
    }

    return true;
  }

  /**
   * Set up mute timeout reminder
   * Requirements 2.7: Mute timeout reminder system
   */
  setupMuteTimeoutReminder(ws, user) {
    if (!this.currentBroadcast) return;

    // Clear any existing reminder
    if (this.currentBroadcast.muteTimeoutReminder) {
      clearTimeout(this.currentBroadcast.muteTimeoutReminder);
    }

    // Set 5-minute reminder
    this.currentBroadcast.muteTimeoutReminder = setTimeout(() => {
      if (this.currentBroadcast && this.currentBroadcast.isMuted && ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'mute_timeout_reminder',
          message: 'Your broadcast has been muted for over 5 minutes. Consider unmuting or ending the session.',
          mutedDuration: 5 * 60 * 1000 // 5 minutes in milliseconds
        }));
        
        console.log(`⏰ Mute timeout reminder sent to ${user.email}`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Notify all connected listeners about broadcast state changes
   * Requirements 2.4, 2.6, 5.1, 5.2, 5.3: Real-time listener notifications
   */
  async notifyListeners(eventData) {
    try {
      const apiKey = config.INTERNAL_API_KEY || 'internal';
      const apiUrl = `${config.NEXTJS_API_URL}/api/live/notify`;
      
      console.log('🔍 Notify Debug:', {
        apiUrl,
        eventType: eventData.type,
        hasApiKey: !!apiKey
      });
      
      // Send notification to Next.js API to broadcast via SSE
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          action: 'broadcast_event',
          ...eventData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ Failed to notify listeners via API: ${response.status} - ${errorText}`);
      } else {
        console.log('📡 Listeners notified:', eventData.type);
      }
    } catch (error) {
      console.error('❌ Error notifying listeners:', error);
    }
  }

  /**
   * Set reference to test stream route for live streaming
   */
  setTestStreamRoute(testStreamRoute) {
    this.testStreamRoute = testStreamRoute;
  }

  /**
   * Clean up old test stream files to prevent disk space issues
   */
  cleanupOldTestFiles() {
    try {
      const fs = require('fs');
      const path = require('path');
      const gatewayDir = path.dirname(__dirname);
      
      const files = fs.readdirSync(gatewayDir)
        .filter(file => file.startsWith('test-stream-') && file.endsWith('.mp3'))
        .map(file => ({
          name: file,
          path: path.join(gatewayDir, file),
          mtime: fs.statSync(path.join(gatewayDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      // Keep only the 3 most recent files, delete the rest
      const filesToDelete = files.slice(3);
      
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Cleaned up old test stream: ${file.name}`);
        } catch (error) {
          console.warn(`⚠️ Could not delete ${file.name}:`, error.message);
        }
      });
      
      if (filesToDelete.length > 0) {
        console.log(`🧹 Cleaned up ${filesToDelete.length} old test stream files`);
      }
    } catch (error) {
      console.warn('⚠️ Error during test file cleanup:', error.message);
    }
  }
}

module.exports = BroadcastService;