/**
 * WebSocket Handler for broadcast connections
 * 
 * SECURITY: Authentication now happens via 'authenticate' message
 * instead of URL query string to prevent token logging
 */

const WebSocket = require('ws');
const { verifyWebSocketClient, verifyJWT } = require('../middleware/auth');

class WebSocketHandler {
  constructor(server, broadcastService, databaseService, port) {
    this.broadcastService = broadcastService;
    this.databaseService = databaseService;
    this.port = port;
    
    // Attach WebSocket to HTTP server
    this.wss = new WebSocket.Server({ 
      server: server,
      verifyClient: (info) => verifyWebSocketClient(info, port),
      // Configure for binary data handling
      perMessageDeflate: false,
      maxPayload: 1024 * 1024 // 1MB max payload
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('🔌 WebSocket server attached to HTTP server');
  }

  async handleConnection(ws, req) {
    // WebSocket connected, but not yet authenticated
    // Client must send 'authenticate' message within 5 seconds
    
    let user = null;
    let authenticated = false;
    let authTimeout = null;

    // Wait for authenticate message
    const firstMessageHandler = async (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'authenticate') {
          // Verify JWT token from message
          try {
            user = verifyJWT(data.token);
            authenticated = true;
            
            console.log(`✅ User authenticated: ${user.email} (${user.role})`);
            clearTimeout(authTimeout);
            
            // Remove this handler and attach normal message handler
            ws.removeListener('message', firstMessageHandler);
            ws.on('message', (msg) => this.handleMessage(ws, user, msg));
            
            // Process connection normally
            await this.processAuthenticatedConnection(ws, user);
          } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication failed: Invalid token'
            }));
            ws.close(4001, 'Authentication failed');
          }
        } else {
          console.warn('⚠️  Received non-authenticate message before auth');
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Must send authenticate message first'
          }));
        }
      } catch (error) {
        console.error('Error parsing first message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    };

    // Listen for first message with timeout
    ws.on('message', firstMessageHandler);
    
    // Set authentication timeout - if no authenticate message in 5 seconds, close
    authTimeout = setTimeout(() => {
      if (!authenticated) {
        console.log('❌ Connection closed: No authentication within 5 seconds');
        ws.close(4000, 'Authentication timeout');
      }
    }, 5000);

    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket error before auth:', error);
      clearTimeout(authTimeout);
    });

    // Handle early close
    ws.on('close', () => {
      clearTimeout(authTimeout);
      if (!authenticated) {
        console.log('Connection closed before authentication');
      }
    });
  }

  async processAuthenticatedConnection(ws, user) {
    console.log(`🔌 Processing authenticated connection from ${user.email} (${user.role})`);

    // Check database for existing live session
    const liveState = await this.databaseService.getLiveState();
    const currentUserLecturer = user.name || user.email;
    const currentBroadcast = this.broadcastService.getCurrentBroadcast();

    // Check if someone is already broadcasting
    if (currentBroadcast) {
      // Check if it's the same user trying to reconnect
      if (currentBroadcast.user.userId === user.userId) {
        console.log(`🔄 User ${user.email} reconnecting to existing session`);
        
        // Clear cleanup timeout since user reconnected
        if (currentBroadcast.cleanupTimeout) {
          clearTimeout(currentBroadcast.cleanupTimeout);
          currentBroadcast.cleanupTimeout = null;
        }
        
        // Restore the WebSocket connection
        currentBroadcast.ws = ws;
        currentBroadcast.disconnectedAt = null;
        
        // Setup message handlers for new connection
        ws.on('close', () => this.handleDisconnection(user));
        ws.on('error', (error) => this.handleError(user, error));

        // Check if session was auto-muted due to disconnection
        const liveState = await this.databaseService.getLiveState();
        if (liveState && liveState.isLive && liveState.isMuted) {
          // Session was auto-muted, notify client they can unmute
          ws.send(JSON.stringify({
            type: 'session_recovered',
            message: 'Session was auto-muted due to disconnection. You can unmute to continue broadcasting.',
            isMuted: true,
            startedAt: liveState.startedAt?.toISOString()
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
          message: `Another presenter (${currentBroadcast.user.email}) is currently live. Please try again later.`
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
        this.broadcastService.setCurrentBroadcast({
          ws,
          user,
          startTime: liveState.startedAt || new Date()
        });
        
        // Setup message handlers
        ws.on('close', () => this.handleDisconnection(user));
        ws.on('error', (error) => this.handleError(user, error));

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
    this.broadcastService.setCurrentBroadcast({
      ws,
      user,
      startTime: new Date()
    });

    // Setup message handlers
    ws.on('close', () => this.handleDisconnection(user));
    ws.on('error', (error) => this.handleError(user, error));

    // Send ready signal
    ws.send(JSON.stringify({
      type: 'ready',
      message: 'Connected to broadcast gateway. Ready to stream.'
    }));
  }

  handleMessage(ws, user, message) {
    try {
      // Log message type periodically to debug
      if (!this.messageTypeLogCount) {
        this.messageTypeLogCount = 0;
        this.messageTypeLogStartTime = Date.now();
      }
      
      this.messageTypeLogCount++;
      
      if (this.messageTypeLogCount % 100 === 0) {
        const elapsed = Date.now() - this.messageTypeLogStartTime;
        const rate = (this.messageTypeLogCount / elapsed * 1000).toFixed(1);
        console.log(`📨 Message type: ${typeof message}, constructor: ${message?.constructor?.name}, rate: ${rate} msg/sec`);
      }
      
      // Handle different message types
      if (typeof message === 'string') {
        // String JSON control message
        const data = JSON.parse(message);
        this.handleControlMessage(ws, user, data);
      } else if (Buffer.isBuffer(message) || message instanceof ArrayBuffer) {
        // Binary data - check if it's JSON or audio
        const buffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
        
        // Check first byte to determine if it's JSON
        if (buffer.length > 0 && (buffer[0] === 0x7B || buffer[0] === 0x5B)) {
          // Starts with '{' or '[' - likely JSON
          try {
            const data = JSON.parse(buffer.toString('utf8'));
            this.handleControlMessage(ws, user, data);
          } catch (jsonError) {
            // If JSON parsing fails, treat as binary audio data
            this.handleAudioData(ws, user, buffer);
          }
        } else {
          // Binary audio data
          this.handleAudioData(ws, user, buffer);
        }
      } else {
        // Handle the case where typeof === 'object' but it's actually a Buffer
        // This happens in some Node.js/WebSocket configurations
        if (message && message.constructor && message.constructor.name === 'Buffer') {
          // It's a Buffer disguised as an object
          this.handleAudioData(ws, user, message);
        } else {
          console.log('⚠️ Unknown message type:', typeof message, message.constructor?.name);
        }
      }
    } catch (error) {
      // Only log errors for string messages (control messages)
      if (typeof message === 'string') {
        console.error('❌ Error parsing control message:', error.message);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process control message'
        }));
      }
      // Silently ignore binary data errors
    }
  }

  handleControlMessage(ws, user, data) {
    console.log(`📨 Control message from ${user.email}:`, data.type);

    try {
      switch (data.type) {
        case 'configure_latency':
          if (data.mode === 'ultra_low') {
            console.log(`🚀 Ultra low-latency mode enabled for ${user.email}`);
            // Store latency preference for this connection
            const currentBroadcast = this.broadcastService.getCurrentBroadcast();
            if (currentBroadcast) {
              currentBroadcast.latencyMode = 'ultra_low';
            }
          }
          break;
          
        case 'start_stream':
          console.log(`🎙️ Processing start_stream request from ${user.email} with config:`, data);
          this.broadcastService.startStreaming(ws, user, data);
          break;
        
        case 'reconnect_stream':
          this.broadcastService.reconnectStreaming(ws, user, data);
          break;
        
        case 'stop_stream':
          console.log(`🛑 Processing stop request from ${user.email}`);
          this.broadcastService.stopStreaming(ws, user);
          break;

        // New broadcast control commands
        case 'mute_broadcast':
          console.log(`🔇 Processing mute request from ${user.email}`);
          this.broadcastService.muteBroadcast(ws, user);
          break;

        case 'unmute_broadcast':
          console.log(`🔊 Processing unmute request from ${user.email}`);
          this.broadcastService.unmuteBroadcast(ws, user);
          break;

        case 'toggle_monitor':
          console.log(`🎧 Processing monitor toggle from ${user.email}:`, data.enabled);
          this.broadcastService.toggleMonitor(ws, user, data.enabled);
          break;

        case 'inject_audio':
          console.log(`🎵 Processing audio injection from ${user.email}:`, data.fileId);
          this.broadcastService.injectAudio(ws, user, data);
          break;

        case 'stop_audio_injection':
          console.log(`⏹️ Processing stop audio injection from ${user.email}`);
          this.broadcastService.stopAudioInjection(ws, user);
          break;
        
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        
        default:
          console.log('⚠️ Unknown control message:', data.type);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: `Unknown command: ${data.type}` 
          }));
      }
    } catch (error) {
      console.error(`❌ Error handling control message ${data.type}:`, error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Failed to process ${data.type}: ${error.message}` 
      }));
    }
  }

  handleAudioData(ws, user, audioBuffer) {
    const streamingStatus = this.broadcastService.getStreamingStatus();
    
    // CRITICAL FIX: Write audio data even if FFmpeg is "not ready"
    // FFmpeg may be spawning/connecting - we MUST send audio to activate the stream
    // The handleAudioData method in BroadcastService will set isStreaming when it succeeds
    if (!streamingStatus.hasBroadcast) {
      // Only skip if NO broadcast session exists
      if (!this.lastAudioDataWarning || Date.now() - this.lastAudioDataWarning > 1000) {
        console.warn(`⚠️ Audio data received but no broadcast session`);
        this.lastAudioDataWarning = Date.now();
      }
      return;
    }

    try {
      // Log audio data reception periodically (every 50 chunks to avoid spam)
      if (!this.audioDataChunkCount) {
        this.audioDataChunkCount = 0;
        this.audioDataStartTime = Date.now();
      }
      
      this.audioDataChunkCount++;
      
      if (this.audioDataChunkCount % 50 === 0) {
        const elapsed = Date.now() - this.audioDataStartTime;
        const rate = (this.audioDataChunkCount / elapsed * 1000).toFixed(1);
        console.log(`📊 Audio data flowing: ${this.audioDataChunkCount} chunks received (${rate} chunks/sec), buffer size: ${audioBuffer.length} bytes`);
      }
      
      // Send audio data to broadcast service
      this.broadcastService.handleAudioData(audioBuffer);
    } catch (error) {
      console.error('❌ Error handling audio data:', error);
      this.broadcastService.restartFFmpeg(ws, user);
    }
  }

  async handleDisconnection(user) {
    console.log(`🔌 Disconnected: ${user.email}`);

    const currentBroadcast = this.broadcastService.getCurrentBroadcast();
    if (currentBroadcast && currentBroadcast.user.userId === user.userId) {
      console.log(`⏳ Admin disconnected — waiting 30s for reconnect before stopping broadcast`);

      // Mark disconnection time
      currentBroadcast.disconnectedAt = Date.now();

      // Grace period: give the admin 30 seconds to reconnect (page refresh, network blip)
      // If they reconnect, processAuthenticatedConnection clears this timeout.
      currentBroadcast.cleanupTimeout = setTimeout(async () => {
        // Only stop if they haven't reconnected
        const broadcast = this.broadcastService.getCurrentBroadcast();
        if (broadcast && broadcast.user.userId === user.userId && broadcast.disconnectedAt) {
          console.log(`🛑 Grace period expired — stopping broadcast for ${user.email}`);
          await this.broadcastService.stopStreaming(null, user);
        }
      }, 30000); // 30 second grace period
    }
  }

  handleError(user, error) {
    console.error(`❌ WebSocket error for ${user.email}:`, error);
  }
}

module.exports = WebSocketHandler;