/**
 * WebSocket Handler for broadcast connections
 */

const WebSocket = require('ws');
const { verifyWebSocketClient } = require('../middleware/auth');

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
    const user = req.user;
    
    console.log(`🔌 New connection from ${user.email} (${user.role})`);

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
        ws.on('message', (message) => this.handleMessage(ws, user, message));
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
        ws.on('message', (message) => this.handleMessage(ws, user, message));
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
    ws.on('message', (message) => this.handleMessage(ws, user, message));
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
    if (!streamingStatus.isStreaming || !streamingStatus.hasFFmpeg) {
      return;
    }

    try {
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
      // Stop the broadcast when admin disconnects (simplified behavior)
      console.log(`🛑 Stopping broadcast for ${user.email} due to disconnection`);
      
      await this.broadcastService.stopStreaming(null, user);
      
      console.log(`📡 Broadcast stopped for ${user.email} - they can start a new session when they return`);
    }
  }

  handleError(user, error) {
    console.error(`❌ WebSocket error for ${user.email}:`, error);
  }
}

module.exports = WebSocketHandler;