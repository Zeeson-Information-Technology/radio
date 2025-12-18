/**
 * Broadcast Service for FFmpeg and streaming operations
 */

const { spawn } = require('child_process');
const config = require('../config');

class BroadcastService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.ffmpegProcess = null;
    this.isStreaming = false;
    this.currentBroadcast = null;
  }

  async startStreaming(ws, user, streamConfig = {}) {
    if (this.isStreaming) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Stream already active'
      }));
      return;
    }

    console.log(`🎙️ Starting stream for ${user.email}`);

    // Standard audio config for reliable streaming (no distortion)
    const audioConfig = {
      sampleRate: streamConfig.sampleRate || 44100, // Standard CD quality sample rate
      channels: streamConfig.channels || 1,         // Mono for voice/radio
      bitrate: streamConfig.bitrate || 128          // Standard streaming bitrate
    };

    // Update database - set live state
    await this.databaseService.updateLiveState({
      isLive: true,
      isMuted: false,
      title: streamConfig.title || 'Live Lecture',
      lecturer: user.name || user.email,
      startedAt: new Date()
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
        startedAt: liveState.startedAt
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
    const icecastUrl = `icecast://source:${config.ICECAST_PASSWORD}@${config.ICECAST_HOST}:${config.ICECAST_PORT}${config.ICECAST_MOUNT}`;
    
    // Simple, reliable MP3 streaming configuration
    const ffmpegArgs = [
      // Input: Raw PCM from browser
      '-f', 's16le',
      '-ar', audioConfig.sampleRate.toString(),
      '-ac', audioConfig.channels.toString(),
      '-i', 'pipe:0',
      
      // MP3 encoding
      '-acodec', 'libmp3lame',
      '-ab', '128k',
      '-ar', '44100',
      '-ac', '1',
      
      // Output format
      '-f', 'mp3',
      
      // Icecast metadata
      '-content_type', 'audio/mpeg',
      '-ice_name', 'Al-Manhaj Radio',
      '-ice_description', `Live from ${user.name || user.email}`,
      '-ice_genre', 'Islamic',
      '-ice_public', '1',
      
      // Output to Icecast
      icecastUrl
    ];

    console.log('🔧 Starting FFmpeg with args:', ffmpegArgs.join(' '));

    this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle FFmpeg events
    this.ffmpegProcess.on('spawn', () => {
      console.log('✅ FFmpeg process started');
      this.isStreaming = true;
      
      ws.send(JSON.stringify({
        type: 'stream_started',
        message: 'Live stream active',
        config: audioConfig
      }));
    });

    this.ffmpegProcess.on('error', (error) => {
      console.error('❌ FFmpeg error:', error);
      this.handleFFmpegError(ws, user, error);
    });

    this.ffmpegProcess.on('exit', (code, signal) => {
      console.log(`🔚 FFmpeg exited with code ${code}, signal ${signal}`);
      this.isStreaming = false;
      
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
      mutedAt: null
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
}

module.exports = BroadcastService;