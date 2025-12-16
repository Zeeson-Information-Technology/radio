#!/usr/bin/env node

/**
 * Al-Manhaj Radio - Broadcast Gateway Service
 * Receives browser audio via WebSocket → Encodes to MP3 → Streams to Icecast
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

// Environment variables
const PORT = process.env.GATEWAY_PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const ICECAST_HOST = process.env.ICECAST_HOST || 'localhost';
const ICECAST_PORT = process.env.ICECAST_PORT || 8000;
const ICECAST_PASSWORD = process.env.ICECAST_PASSWORD || 'hackme';
const ICECAST_MOUNT = process.env.ICECAST_MOUNT || '/stream';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/online-radio';
const NEXTJS_URL = process.env.NEXTJS_URL || 'http://localhost:3000';

// AWS Configuration for audio conversion
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'almanhaj-radio-audio';
const CONVERSION_TEMP_DIR = process.env.CONVERSION_TEMP_DIR || '/tmp/audio-conversion';
const CONVERSION_MAX_CONCURRENT = parseInt(process.env.CONVERSION_MAX_CONCURRENT) || 2;

// Configure AWS
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    region: AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
}

const s3 = new AWS.S3();

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

// AudioRecording Schema for conversion
const AudioRecordingSchema = new mongoose.Schema({
  title: String,
  lecturer: String,
  format: String,
  storageUrl: String,
  conversionStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending'
  },
  originalKey: String,
  playbackKey: String,
  playbackUrl: String,
  conversionError: String,
  conversionAttempts: { type: Number, default: 0 },
  lastConversionAttempt: Date,
  createdAt: { type: Date, default: Date.now }
});

const AudioRecording = mongoose.models.AudioRecording || mongoose.model('AudioRecording', AudioRecordingSchema);

// Audio Conversion Service
class AudioConversionService {
  constructor() {
    this.queue = [];
    this.processing = new Set();
    this.jobs = new Map(); // jobId -> job details
    this.maxConcurrent = CONVERSION_MAX_CONCURRENT;
    
    this.ensureTempDirectory();
    this.processQueue();
  }

  async ensureTempDirectory() {
    try {
      await fs.promises.mkdir(CONVERSION_TEMP_DIR, { recursive: true });
      console.log(`📁 Temp directory ready: ${CONVERSION_TEMP_DIR}`);
    } catch (error) {
      console.error('❌ Failed to create temp directory:', error);
    }
  }

  async queueConversion(recordId, originalKey, format) {
    // Check if already converted (idempotency)
    const recording = await AudioRecording.findById(recordId);
    if (!recording) {
      throw new Error('Recording not found');
    }

    if (recording.conversionStatus === 'ready') {
      return {
        jobId: `existing_${recordId}`,
        status: 'completed',
        playbackUrl: recording.playbackUrl
      };
    }

    if (recording.conversionStatus === 'processing') {
      // Find existing job
      for (const [jobId, job] of this.jobs.entries()) {
        if (job.recordId === recordId) {
          return { jobId, status: 'processing' };
        }
      }
    }

    // Create new conversion job
    const jobId = uuidv4();
    const job = {
      jobId,
      recordId,
      originalKey,
      format,
      status: 'queued',
      createdAt: new Date(),
      progress: 0
    };

    this.jobs.set(jobId, job);
    this.queue.push(job);

    // Update database status
    await AudioRecording.findByIdAndUpdate(recordId, {
      conversionStatus: 'pending',
      lastConversionAttempt: new Date()
    });

    console.log(`🎵 Queued conversion job ${jobId} for record ${recordId}`);
    return { jobId, status: 'queued' };
  }

  async processQueue() {
    setInterval(async () => {
      if (this.queue.length === 0 || this.processing.size >= this.maxConcurrent) {
        return;
      }

      const job = this.queue.shift();
      if (!job) return;

      this.processing.add(job.jobId);
      job.status = 'processing';

      try {
        await this.processConversion(job);
      } catch (error) {
        console.error(`❌ Conversion job ${job.jobId} failed:`, error);
        await this.handleConversionError(job, error);
      } finally {
        this.processing.delete(job.jobId);
      }
    }, 1000);
  }

  async processConversion(job) {
    console.log(`🔄 Processing conversion job ${job.jobId}`);
    
    const { recordId, originalKey } = job;
    const recording = await AudioRecording.findById(recordId);
    
    if (!recording) {
      throw new Error('Recording not found');
    }

    // Update database to processing
    await AudioRecording.findByIdAndUpdate(recordId, {
      conversionStatus: 'processing'
    });

    // Generate file paths
    const tempInputPath = path.join(CONVERSION_TEMP_DIR, `${job.jobId}_input.amr`);
    const tempOutputPath = path.join(CONVERSION_TEMP_DIR, `${job.jobId}_output.mp3`);
    const playbackKey = `playback/${recordId}.mp3`;

    try {
      // Download AMR file from S3
      job.progress = 10;
      console.log(`📥 Downloading ${originalKey} from S3...`);
      
      const s3Object = await s3.getObject({
        Bucket: AWS_S3_BUCKET,
        Key: originalKey
      }).promise();

      await fs.promises.writeFile(tempInputPath, s3Object.Body);
      job.progress = 30;

      // Convert AMR to MP3 using FFmpeg
      console.log(`🎵 Converting AMR to MP3...`);
      await this.convertAudioFile(tempInputPath, tempOutputPath);
      job.progress = 70;

      // Upload MP3 to S3
      console.log(`📤 Uploading MP3 to S3...`);
      const mp3Data = await fs.promises.readFile(tempOutputPath);
      
      await s3.putObject({
        Bucket: AWS_S3_BUCKET,
        Key: playbackKey,
        Body: mp3Data,
        ContentType: 'audio/mpeg'
      }).promise();

      const playbackUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${playbackKey}`;
      job.progress = 90;

      // Update database record
      await AudioRecording.findByIdAndUpdate(recordId, {
        conversionStatus: 'ready',
        playbackKey,
        playbackUrl,
        conversionError: null
      });

      job.status = 'completed';
      job.progress = 100;
      job.playbackUrl = playbackUrl;

      console.log(`✅ Conversion job ${job.jobId} completed successfully`);

    } finally {
      // Clean up temp files
      try {
        await fs.promises.unlink(tempInputPath).catch(() => {});
        await fs.promises.unlink(tempOutputPath).catch(() => {});
      } catch (error) {
        console.warn('⚠️ Failed to clean up temp files:', error);
      }
    }
  }

  async convertAudioFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate(64) // 64kbps for voice recordings
        .audioChannels(1) // Mono
        .audioFrequency(22050) // 22kHz sample rate
        .output(outputPath)
        .on('end', () => {
          console.log('🎵 FFmpeg conversion completed');
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ FFmpeg conversion failed:', error);
          reject(error);
        })
        .run();
    });
  }

  async handleConversionError(job, error) {
    const { recordId } = job;
    
    // Increment retry count
    const recording = await AudioRecording.findById(recordId);
    const attempts = (recording.conversionAttempts || 0) + 1;
    
    if (attempts < 3) {
      // Retry
      console.log(`🔄 Retrying conversion job ${job.jobId} (attempt ${attempts + 1})`);
      
      await AudioRecording.findByIdAndUpdate(recordId, {
        conversionStatus: 'pending',
        conversionAttempts: attempts,
        lastConversionAttempt: new Date()
      });

      // Re-queue with delay
      setTimeout(() => {
        job.status = 'queued';
        this.queue.push(job);
      }, Math.pow(2, attempts) * 1000); // Exponential backoff
      
    } else {
      // Mark as failed
      console.log(`❌ Conversion job ${job.jobId} failed permanently after ${attempts} attempts`);
      
      await AudioRecording.findByIdAndUpdate(recordId, {
        conversionStatus: 'failed',
        conversionError: error.message,
        conversionAttempts: attempts,
        lastConversionAttempt: new Date()
      });

      job.status = 'failed';
      job.error = error.message;
    }
  }

  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress || 0,
      error: job.error || null,
      playbackUrl: job.playbackUrl || null
    };
  }
}

class BroadcastGateway {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = null;
    this.currentBroadcast = null;
    this.ffmpegProcess = null;
    this.isStreaming = false;
    this.conversionService = new AudioConversionService();
    
    this.connectToDatabase();
    this.setupExpressApp();
    this.setupWebSocketServer();
    this.setupGracefulShutdown();
    this.startServer();
  }

  async connectToDatabase() {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('📊 Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
    }
  }

  setupExpressApp() {
    // Middleware
    this.app.use(express.json());
    this.app.use(cors({ 
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://almanhaj.vercel.app']
    }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        services: {
          websocket: this.wss ? 'active' : 'inactive',
          conversion: 'active',
          icecast: this.isStreaming ? 'connected' : 'disconnected'
        },
        timestamp: new Date().toISOString()
      });
    });

    // Emergency stop endpoint for super admins
    this.app.post('/api/emergency-stop', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const { adminId, adminEmail, reason } = req.body;

        console.log(`🚨 Emergency stop received from admin: ${adminEmail}`);
        console.log(`📋 Reason: ${reason}`);

        // Force stop any active broadcast
        if (this.currentBroadcast) {
          console.log(`🛑 Terminating active broadcast by ${this.currentBroadcast.user.email}`);
          
          // Stop FFmpeg process
          if (this.ffmpegProcess) {
            this.ffmpegProcess.kill('SIGTERM');
            this.ffmpegProcess = null;
          }

          // Clear streaming state
          this.isStreaming = false;
          
          // Clear any cleanup timeouts
          if (this.currentBroadcast.cleanupTimeout) {
            clearTimeout(this.currentBroadcast.cleanupTimeout);
          }

          // Notify the broadcaster if still connected
          if (this.currentBroadcast.ws && this.currentBroadcast.ws.readyState === 1) {
            this.currentBroadcast.ws.send(JSON.stringify({
              type: 'emergency_stop',
              message: 'Broadcast terminated by administrator',
              stoppedBy: adminEmail,
              reason: reason
            }));
            this.currentBroadcast.ws.close();
          }

          // Clear the broadcast session
          this.currentBroadcast = null;
        }

        // Update database state
        await this.updateLiveState({
          isLive: false,
          isPaused: false,
          title: null,
          lecturer: null,
          startedAt: null,
          pausedAt: null
        });

        console.log(`✅ Emergency stop completed by ${adminEmail}`);

        res.json({
          success: true,
          message: 'Emergency stop executed successfully',
          stoppedBy: adminEmail,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Emergency stop error:', error);
        res.status(500).json({
          success: false,
          error: 'Emergency stop failed',
          message: error.message
        });
      }
    });

    // Audio conversion endpoints
    this.app.post('/api/convert-audio', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const { recordId, originalKey, format } = req.body;

        // Validate request
        if (!recordId || !originalKey || !format) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: recordId, originalKey, format',
            code: 'INVALID_REQUEST'
          });
        }

        if (format !== 'amr') {
          return res.status(400).json({
            success: false,
            error: 'Only AMR format is supported for conversion',
            code: 'INVALID_FORMAT'
          });
        }

        // Queue conversion
        const result = await this.conversionService.queueConversion(recordId, originalKey, format);
        
        res.json({
          success: true,
          jobId: result.jobId,
          status: result.status,
          message: result.status === 'completed' ? 'File already converted' : 'Conversion job queued successfully',
          playbackUrl: result.playbackUrl || null
        });

      } catch (error) {
        console.error('❌ Conversion API error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          code: 'CONVERSION_FAILED'
        });
      }
    });

    this.app.get('/api/convert-status/:jobId', this.authenticateToken.bind(this), (req, res) => {
      try {
        const { jobId } = req.params;
        const status = this.conversionService.getJobStatus(jobId);

        if (!status) {
          return res.status(404).json({
            success: false,
            error: 'Job not found',
            code: 'JOB_NOT_FOUND'
          });
        }

        res.json(status);
      } catch (error) {
        console.error('❌ Status API error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          code: 'STATUS_ERROR'
        });
      }
    });

    console.log('🌐 Express app configured with conversion API endpoints');
  }

  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'UNAUTHORIZED'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'almanhaj-radio',
        audience: 'broadcast-gateway'
      });
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'FORBIDDEN'
      });
    }
  }

  setupWebSocketServer() {
    // Attach WebSocket to HTTP server
    this.wss = new WebSocket.Server({ 
      server: this.server,
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('🔌 WebSocket server attached to HTTP server');
  }

  startServer() {
    this.server.listen(PORT, () => {
      console.log(`🎙️ Broadcast Gateway listening on port ${PORT}`);
      console.log(`📡 HTTP API: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`📡 Icecast target: ${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}`);
      console.log(`🎵 Audio conversion service initialized`);
    });
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
        
        // Clear cleanup timeout since user reconnected
        if (this.currentBroadcast.cleanupTimeout) {
          clearTimeout(this.currentBroadcast.cleanupTimeout);
          this.currentBroadcast.cleanupTimeout = null;
        }
        
        // Restore the WebSocket connection
        this.currentBroadcast.ws = ws;
        this.currentBroadcast.disconnectedAt = null;
        
        // Setup message handlers for new connection
        ws.on('message', this.handleMessage.bind(this, ws, user));
        ws.on('close', this.handleDisconnection.bind(this, user));
        ws.on('error', this.handleError.bind(this, user));

        // Check if session was auto-paused due to disconnection
        const liveState = await this.getLiveState();
        if (liveState && liveState.isLive && liveState.isPaused) {
          // Session was auto-paused, notify client they can resume
          ws.send(JSON.stringify({
            type: 'session_recovered',
            message: 'Session was auto-paused due to disconnection. You can resume broadcasting.',
            isPaused: true,
            startedAt: liveState.startedAt?.toISOString(),
            pausedAt: liveState.pausedAt?.toISOString()
          }));
        } else {
          // Normal reconnection to active session
          ws.send(JSON.stringify({
            type: 'ready',
            message: 'Reconnected to existing broadcast session.'
          }));
        }
        
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

  async pauseStreaming(ws, user, keepFFmpeg = true) {
    console.log(`⏸️ Pausing stream for ${user.email}`);

    // For manual pause, keep FFmpeg running
    // For disconnection pause, we might want to stop FFmpeg to save resources
    if (!keepFFmpeg && this.ffmpegProcess) {
      console.log(`🛑 Stopping FFmpeg during pause to save resources`);
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
      this.isStreaming = false;
    }

    // Update database to paused state
    await this.updateLiveState({
      isLive: true,
      isPaused: true,
      pausedAt: new Date()
      // Keep title, lecturer, startedAt unchanged
    });

    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stream_paused',
        message: 'Stream paused successfully'
      }));
    }
  }

  async resumeStreaming(ws, user) {
    console.log(`▶️ Resuming stream for ${user.email}`);

    // If FFmpeg process was stopped during disconnection, restart it
    if (!this.ffmpegProcess || !this.isStreaming) {
      console.log(`🔄 Restarting FFmpeg for resumed session`);
      const audioConfig = { sampleRate: 44100, channels: 1, bitrate: 96 };
      this.startFFmpeg(ws, user, audioConfig);
    }

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

    // Clear any cleanup timeout
    if (this.currentBroadcast && this.currentBroadcast.cleanupTimeout) {
      clearTimeout(this.currentBroadcast.cleanupTimeout);
      this.currentBroadcast.cleanupTimeout = null;
    }

    // Update database - set offline state
    await this.updateLiveState({
      isLive: false,
      isPaused: false,
      title: null,
      lecturer: null,
      startedAt: null,
      pausedAt: null
    });

    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stream_stopped',
        message: 'Stream ended successfully'
      }));
    }

    // Clear the current broadcast session
    this.currentBroadcast = null;
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
      // Auto-pause instead of stopping to allow reconnection
      console.log(`⏸️ Auto-pausing broadcast for ${user.email} due to disconnection`);
      
      // Pause streaming but stop FFmpeg to save resources (will restart on resume)
      await this.pauseStreaming(null, user, false); // false = don't keep FFmpeg running

      // Clear WebSocket but preserve session for reconnection
      this.currentBroadcast.ws = null;
      this.currentBroadcast.disconnectedAt = new Date();
      
      // Set timeout to clean up session if admin doesn't reconnect within 30 minutes
      this.currentBroadcast.cleanupTimeout = setTimeout(async () => {
        if (this.currentBroadcast && this.currentBroadcast.user.userId === user.userId) {
          console.log(`🧹 Cleaning up abandoned session for ${user.email} after 30 minutes`);
          await this.stopStreaming(null, user);
          this.currentBroadcast = null;
        }
      }, 30 * 60 * 1000); // 30 minutes
      
      console.log(`📡 Session preserved for ${user.email} - can reconnect within 30 minutes to resume`);
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
      
      if (this.server) {
        this.server.close();
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// Start the gateway
new BroadcastGateway();