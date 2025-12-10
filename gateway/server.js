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

// Environment variables
const PORT = process.env.GATEWAY_PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const ICECAST_HOST = process.env.ICECAST_HOST || 'localhost';
const ICECAST_PORT = process.env.ICECAST_PORT || 8000;
const ICECAST_PASSWORD = process.env.ICECAST_PASSWORD || 'hackme';
const ICECAST_MOUNT = process.env.ICECAST_MOUNT || '/stream';

class BroadcastGateway {
  constructor() {
    this.wss = null;
    this.currentBroadcast = null;
    this.ffmpegProcess = null;
    this.isStreaming = false;
    
    this.setupWebSocketServer();
    this.setupGracefulShutdown();
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

      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Store user info for later use
      info.req.user = decoded;
      
      console.log(`✅ Token verified for user: ${decoded.email} (${decoded.role})`);
      return true;
    } catch (error) {
      console.log('❌ Connection rejected: Invalid token', error.message);
      return false;
    }
  }

  handleConnection(ws, req) {
    const user = req.user;
    
    console.log(`🔌 New connection from ${user.email} (${user.role})`);

    // Check if someone is already broadcasting
    if (this.currentBroadcast) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Another presenter is currently live. Please try again later.'
      }));
      ws.close();
      return;
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
      // Check if message is JSON (control message) or binary (audio data)
      if (message[0] === 0x7B) { // JSON starts with '{'
        const data = JSON.parse(message.toString());
        this.handleControlMessage(ws, user, data);
      } else {
        // Binary audio data
        this.handleAudioData(ws, user, message);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
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

  startStreaming(ws, user, config = {}) {
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

    this.startFFmpeg(ws, user, audioConfig);
  }

  startFFmpeg(ws, user, audioConfig) {
    const icecastUrl = `icecast://source:${ICECAST_PASSWORD}@${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}`;
    
    // FFmpeg command to encode PCM to MP3 and stream to Icecast
    const ffmpegArgs = [
      '-f', 'f32le', // Input format: 32-bit float PCM
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

  stopStreaming(ws, user) {
    console.log(`🛑 Stopping stream for ${user.email}`);

    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    this.isStreaming = false;

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

  handleDisconnection(user) {
    console.log(`🔌 Disconnected: ${user.email}`);

    if (this.currentBroadcast && this.currentBroadcast.user.userId === user.userId) {
      this.stopStreaming(this.currentBroadcast.ws, user);
      this.currentBroadcast = null;
    }
  }

  handleError(user, error) {
    console.error(`❌ WebSocket error for ${user.email}:`, error);
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