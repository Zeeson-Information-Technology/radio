#!/usr/bin/env node

/**
 * Al-Manhaj Radio - Broadcast Gateway Service (Modular Version)
 * Receives browser audio via WebSocket → Encodes to MP3 → Streams to Icecast
 */

const express = require('express');
const http = require('http');
const cors = require('cors');

// Import configuration and services
const config = require('./config');
const DatabaseService = require('./services/DatabaseService');
const BroadcastService = require('./services/BroadcastService');
const AudioConversionService = require('./services/AudioConversionService');
const WebSocketHandler = require('./websocket/WebSocketHandler');

// Import routes
const createHealthRoute = require('./routes/health');
const createEmergencyRoute = require('./routes/emergency');
const createConversionRoutes = require('./routes/conversion');

class BroadcastGateway {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Initialize services
    this.databaseService = new DatabaseService();
    this.broadcastService = new BroadcastService(this.databaseService);
    this.conversionService = new AudioConversionService(this.databaseService);
    
    this.init();
  }

  async init() {
    try {
      // Connect to database
      await this.databaseService.connect();
      
      // Setup Express app
      this.setupExpressApp();
      
      // Setup WebSocket server
      this.webSocketHandler = new WebSocketHandler(
        this.server, 
        this.broadcastService, 
        this.databaseService, 
        config.PORT
      );
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Start server
      this.startServer();
      
    } catch (error) {
      console.error('❌ Failed to initialize gateway:', error);
      process.exit(1);
    }
  }

  setupExpressApp() {
    // Middleware
    this.app.use(express.json());
    this.app.use(cors({ 
      origin: config.ALLOWED_ORIGINS
    }));

    // Routes
    this.app.use(createHealthRoute(this.broadcastService));
    this.app.use(createEmergencyRoute(this.broadcastService));
    this.app.use(createConversionRoutes(this.conversionService));

    console.log('🌐 Express app configured with all routes');
  }

  startServer() {
    this.server.listen(config.PORT, () => {
      console.log(`🎙️ Broadcast Gateway listening on port ${config.PORT}`);
      console.log(`📡 HTTP API: http://localhost:${config.PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${config.PORT}`);
      console.log(`📡 Icecast target: ${config.ICECAST_HOST}:${config.ICECAST_PORT}${config.ICECAST_MOUNT}`);
      console.log(`🎵 Audio conversion service initialized`);
    });
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      console.log('🛑 Shutting down Broadcast Gateway...');
      
      // Stop any active streams
      const streamingStatus = this.broadcastService.getStreamingStatus();
      if (streamingStatus.isStreaming) {
        console.log('🛑 Stopping active stream...');
        // Note: We don't have user context here, but we can force stop
        this.broadcastService.stopStreaming(null, { role: 'super_admin' });
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