#!/usr/bin/env node

/**
 * Al-Manhaj Radio - Broadcast Gateway Service
 * Receives browser audio via WebSocket → Encodes to MP3 → Streams to Icecast
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Environment variables
const PORT = process.env.GATEWAY_PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const ICECAST_HOST = process.env.ICECAST_HOST || 'localhost';
const ICECAST_PORT = process.env.ICECAST_PORT || 8000;
const ICECAST_PASSWORD = process.env.ICECAST_PASSWORD || 'hackme';
const ICECAST_MOUNT = process.env.ICECAST_MOUNT || '/stream';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/online-radio';
const NEXTJS_URL = process.env.NEXTJS_URL || 'http://localhost:3000';

// MongoDB LiveState Schema
const LiveStateSchema = new mongoose.Schema({
  isLive: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  mount: { type: String, default: '/stream' },
  title: { type: String, default: null },
  lecturer: { type: String, default: null },
  startedAt: { type: Date, default: null },
  pausedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now }
});

const LiveState = mongoose.models.LiveState || mongoose.model('LiveState', LiveStateSchema);

class BroadcastGateway {
  constructor() {
    this.wss = null;
    this.currentBroadcast = null;
    this.ffmpegProcess = null;
    this.isStreaming = false;
    
    this.connectToDatabase();
    this.setupWebSocketServer();
    this.setupGracefulShutdown();
  }

  async connectToDatabase() {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('📊 Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
    }
  }

  setupWebSocketServer() {
    this.wss = new WebSocket.Server({ 
      port: PORT,
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    console.log(`🎙️ Broadcast Gateway listening on port ${PORT}`);
    console.log(`📡 Icecast target: ${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}`);
  }

  verifyClient(info) {
    try {
      const url = new URL(info.req.url, `ws://localhost:${PORT}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('❌ Connection rejected: No token provided');
        return false;
      }

      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'almanhaj-radio',
        audience: 'broadcast-gateway'
      });
      
      // Store user info for later use
      info.req.user = decoded;
      
      console.log(`✅ Token verified for user: ${decoded.email} (${decoded.role})`);
      return true;
    } catch (error) {
      console.log('❌ Connection rejected: Invalid token', error.message);
      return false;
    }
  }

  async handleConnection(ws, req) {
    const user = req.user;
    
    console.log(`🔌 New connection from ${user.email} (${user.role})`);

    // Check database for existing live session
    const liveState = await this.getLiveState();
    const currentUserLecturer = user.name || user.email;

    // Check if someone is already broadcasting
    if (this.currentBroadcast) {
      // Check if it's the same user trying to reconnect
      if (this.currentBroadcast.user.userId === user.userId) {
        console.log(`🔄 User ${user.email} reconnecting to existing session`);
        
        // Replace the old WebSocket with the new one
        this.currentBroadcast.ws = ws;
        
        // Setup message handlers for new connection
        ws.on('message', this.handleMessage.bind(this, ws, user));
        ws.on('close', this.handleDisconnection.bind(this, user));
        ws.on('error', this.handleError.bind(this, user));

        // Send ready signal
        ws.send(JSON.stringify({
          type: 'ready',
          message: 'Reconnected to existing broadcast session.'
        }));
        
        return;
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Another presenter (${this.currentBroadcast.user.email}) is currently live. Please try again later.`
        }));
        ws.close();
        return;
      }
    }

    // Check if there's a live session in database but no currentBroadcast (gateway restart scenario)
    if (liveState && liveState.isLive) {
      if (liveState.lecturer === currentUserLecturer) {
        console.log(`🔄 Recovering session for ${user.email} after gateway restart`);
        
        // Restore the broadcast session
        this.currentBroadcast = {
          ws,
          user,
          startTime: liveState.startedAt || new Date()
        };
        
        // Setup message handlers
        ws.on('message', this.handleMessage.bind(this, ws, user));
        ws.on('close', this.handleDisconnection.bind(this, user));
        ws.on('error', this.handleError.bind(this, user));

        // Send ready signal
        ws.send(JSON.stringify({
          type: 'ready',
          message: 'Recovered existing broadcast session.'
        }));
        
        return;
      } else {
        // Someone else is live according to database
        ws.send(JSON.stringify({
          type: 'error',
          message: `Another presenter (${liveState.lecturer}) is currently live. Please try again later.`
        }));
        ws.close();
        return;
      }
    }

    // Set this as current broadcast
    this.currentBroadcast = {
      ws,
      user,
      startTime: new Date()
    };

    // Setup message handlers
    ws.on('message', this.handleMessage.bind(this, ws, user));
    ws.on('close', this.handleDisconnection.bind(this, user));
    ws.on('error', this.handleError.bind(this, user));

    // Send ready signal
    ws.send(JSON.stringify({
      type: 'ready',
      message: 'Connected to broadcast gateway. Ready to stream.'
    }));
  }

  handleMessage(ws, user, message) {
    try {
      // Check if message is string (JSON control message) or binary (audio data)
      if (typeof message === 'string' || (message instanceof Buffer && message[0] === 0x7B)) {
        const data = JSON.parse(message.toString());
        this.handleControlMessage(ws, user, data);
      } else if (message instanceof ArrayBuffer || message instanceof Buffer) {
        // Binary audio data
        this.handleAudioData(ws, user, message);
      } else {
        console.log('⚠️ Unknown message type:', typeof message, message.constructor.name);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      console.error('Message type:', typeof message);
      console.error('Message length:', message.length);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  }

  handleControlMessage(ws, user, data) {
    console.log(`📨 Control message from ${user.email}:`, data.type);

    switch (data.type) {
      case 'start_stream':
        this.startStreaming(ws, user, data);
        break;
      
      case 'reconnect_stream':
        this.reconnectStreaming(ws, user, data);
        break;
      
      case 'pause_stream':
        this.pauseStreaming(ws, user);
        break;
      
      case 'resume_stream':
        this.resumeStreaming(ws, user);
        break;
      
      case 'stop_stream':
        this.stopStreaming(ws, user);
        break;
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      
      default:
        console.log('⚠️ Unknown control message:', data.type);
    }
  }

  handleAudioData(ws, user, audioBuffer) {
    if (!this.isStreaming || !this.ffmpegProcess) {
      return;
    }

    try {
      // Write audio data to ffmpeg stdin
      this.ffmpegProcess.stdin.write(audioBuffer);
    } catch (error) {
      console.error('❌ Error writing to ffmpeg:', error);
      this.restartFFmpeg(ws, user);
    }
  }

  async startStreaming(ws, user, config = {}) {
    if (this.isStreaming) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Stream already active'
      }));
      return;
    }

    console.log(`🎙️ Starting stream for ${user.email}`);

    // Default audio config
    const audioConfig = {
      sampleRate: config.sampleRate || 44100,
      channels: config.channels || 1, // Mono for Islamic radio
      bitrate: config.bitrate || 96 // 96kbps for good quality/bandwidth balance
    };

    // Update database - set live state
    await this.updateLiveState({
      isLive: true,
      isPaused: false,
      title: config.title || 'Live Lecture',
      lecturer: user.name || user.email,
      startedAt: new Date(),
      pausedAt: null
    });

    this.startFFmpeg(ws, user, audioConfig);
  }

  async reconnectStreaming(ws, user, config = {}) {
    console.log(`🔄 Reconnecting stream for ${user.email}`);

    // Check database for existing session
    const liveState = await this.getLiveState();
    const currentUserLecturer = user.name || user.email;

    // If already streaming and it's the same user, just acknowledge
    if (this.isStreaming && this.ffmpegProcess && liveState && liveState.lecturer === currentUserLecturer) {
      console.log(`✅ Stream already active for ${user.email}, acknowledging reconnection`);
      ws.send(JSON.stringify({
        type: 'stream_started',
        message: 'Reconnected to existing stream',
        config: {
          sampleRate: config.sampleRate || 44100,
          channels: config.channels || 1,
          bitrate: config.bitrate || 96
        }
      }));
      return;
    }

    // If database shows live session for this user but FFmpeg is not running, restart it
    if (liveState && liveState.isLive && liveState.lecturer === currentUserLecturer) {
      console.log(`🎙️ Restarting FFmpeg for ${user.email} (session recovery)`);
      
      // Default audio config
      const audioConfig = {
        sampleRate: config.sampleRate || 44100,
        channels: config.channels || 1,
        bitrate: config.bitrate || 96
      };

      // Don't update startedAt - keep original time
      await this.updateLiveState({
        isLive: true,
        isPaused: false,
        title: config.title || liveState.title || 'Live Lecture',
        lecturer: user.name || user.email,
        // Keep original startedAt
        startedAt: liveState.startedAt,
        pausedAt: null
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
      this.startStreaming(ws, user, config);
    }
  }

  startFFmpeg(ws, user, audioConfig) {
    const icecastUrl = `icecast://source:${ICECAST_PASSWORD}@${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}`;
    
    // FFmpeg command to encode PCM to MP3 and stream to Icecast
    const ffmpegArgs = [
      '-f', 's16le', // Input format: 16-bit signed PCM little-endian
      '-ar', audioConfig.sampleRate.toString(),
      '-ac', audioConfig.channels.toString(),
      '-i', 'pipe:0', // Read from stdin
      
      // Audio encoding
      '-acodec', 'libmp3lame',
      '-ab', `${audioConfig.bitrate}k`,
      '-ac', '1', // Force mono output
      '-ar', '44100', // Standard sample rate
      
      // Icecast metadata
      '-content_type', 'audio/mpeg',
      '-ice_name', 'Al-Manhaj Radio',
      '-ice_description', `Live from ${user.name || user.email}`,
      '-ice_genre', 'Islamic',
      '-ice_public', '1',
      
      // Output to Icecast
      '-f', 'mp3',
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
      
      if (code !== 0 && this.currentBroadcast) {
        ws.send(JSON.stringify({
          type: 'stream_error',
          message: 'Stream connection lost. Attempting to reconnect...'
        }));
        
        // Auto-restart if unexpected exit
        setTimeout(() => {
          if (this.currentBroadcast && this.currentBroadcast.ws === ws) {
            this.startFFmpeg(ws, user, audioConfig);
          }
        }, 2000);
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
    });
  }

  async pauseStreaming(ws, user) {
    console.log(`⏸️ Pausing stream for ${user.email}`);

    // Keep FFmpeg running but update database to paused state
    await this.updateLiveState({
      isLive: true,
      isPaused: true,
      pausedAt: new Date()
      // Keep title, lecturer, startedAt unchanged
    });

    ws.send(JSON.stringify({
      type: 'stream_paused',
      message: 'Stream paused successfully'
    }));
  }

  async resumeStreaming(ws, user) {
    console.log(`▶️ Resuming stream for ${user.email}`);

    // Update database to resume state
    await this.updateLiveState({
      isLive: true,
      isPaused: false,
      pausedAt: null
      // Keep title, lecturer, startedAt unchanged
    });

    ws.send(JSON.stringify({
      type: 'stream_resumed',
      message: 'Stream resumed successfully'
    }));
  }

  async stopStreaming(ws, user) {
    console.log(`🛑 Stopping stream for ${user.email}`);

    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    this.isStreaming = false;

    // Update database - set offline state
    await this.updateLiveState({
      isLive: false,
      isPaused: false,
      title: null,
      lecturer: null,
      startedAt: null,
      pausedAt: null
    });

    ws.send(JSON.stringify({
      type: 'stream_stopped',
      message: 'Stream ended successfully'
    }));
  }

  handleFFmpegError(ws, user, error) {
    console.error('❌ FFmpeg process error:', error);
    
    this.isStreaming = false;
    
    ws.send(JSON.stringify({
      type: 'stream_error',
      message: 'Encoding error occurred. Please try again.',
      error: error.message
    }));
  }

  restartFFmpeg(ws, user) {
    console.log('🔄 Restarting FFmpeg process...');
    
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
    }
    
    setTimeout(() => {
      if (this.currentBroadcast && this.currentBroadcast.ws === ws) {
        this.startFFmpeg(ws, user, { sampleRate: 44100, channels: 1, bitrate: 96 });
      }
    }, 1000);
  }

  async handleDisconnection(user) {
    console.log(`🔌 Disconnected: ${user.email}`);

    if (this.currentBroadcast && this.currentBroadcast.user.userId === user.userId) {
      await this.stopStreaming(this.currentBroadcast.ws, user);
      this.currentBroadcast = null;
    }
  }

  handleError(user, error) {
    console.error(`❌ WebSocket error for ${user.email}:`, error);
  }

  async getLiveState() {
    try {
      return await LiveState.findOne();
    } catch (error) {
      console.error('❌ Error getting live state:', error);
      return null;
    }
  }

  async updateLiveState(stateData) {
    try {
      // Find existing LiveState or create new one
      let liveState = await LiveState.findOne();
      
      if (!liveState) {
        liveState = new LiveState({
          mount: ICECAST_MOUNT,
          ...stateData,
          updatedAt: new Date()
        });
      } else {
        // Update existing state
        Object.assign(liveState, stateData);
        liveState.updatedAt = new Date();
      }

      await liveState.save();
      console.log(`📊 Updated live state: ${stateData.isLive ? 'LIVE' : 'OFFLINE'}`);
      
      if (stateData.isLive) {
        console.log(`📺 Title: ${stateData.title}`);
        console.log(`🎙️ Lecturer: ${stateData.lecturer}`);
      }
      
      // 🚀 SMART NOTIFICATION: Tell all listeners about the change!
      await this.notifyListeners(liveState);
      
    } catch (error) {
      console.error('❌ Error updating live state:', error);
    }
  }

  async notifyListeners(liveState) {
    try {
      // Get the Next.js app URL (Vercel or localhost)
      const appUrl = process.env.NEXTJS_URL || 'http://localhost:3000';
      
      const response = await fetch(`${appUrl}/api/live/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        },
        body: JSON.stringify({
          isLive: liveState.isLive,
          isPaused: liveState.isPaused,
          title: liveState.title,
          lecturer: liveState.lecturer,
          startedAt: liveState.startedAt?.toISOString()
        })
      });
      
      if (response.ok) {
        console.log('📡 Successfully notified listeners of state change');
      } else {
        console.log('⚠️ Failed to notify listeners:', response.status);
      }
    } catch (error) {
      console.log('⚠️ Error notifying listeners:', error.message);
      // Don't fail the main operation if notification fails
    }
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      console.log('🛑 Shutting down Broadcast Gateway...');
      
      if (this.ffmpegProcess) {
        this.ffmpegProcess.kill('SIGTERM');
      }
      
      if (this.wss) {
        this.wss.close();
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// Start the gateway
new BroadcastGateway();