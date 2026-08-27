#!/usr/bin/env node

/**
 * Al-Manhaj Radio - Broadcast Gateway Service (Modular Version)
 * Receives browser audio via WebSocket → Encodes to MP3 → Streams to Icecast
 */

// Load environment variables
require('dotenv').config();

const { execSync } = require('child_process');

// Kill any orphaned FFmpeg processes from a previous crashed session
// before starting fresh — prevents memory leaks accumulating over restarts
try {
  execSync('pkill -9 -f "ffmpeg.*icecast" 2>/dev/null || true', { stdio: 'ignore' });
  console.log('🧹 Cleared any orphaned FFmpeg processes');
} catch (_) { /* ignore — pkill exits 1 when nothing matched */ }

const express = require('express');
const http = require('http');
const cors = require('cors');

// Import configuration and services
const config = require('./config');
const DatabaseService = require('./services/DatabaseService');
const BroadcastService = require('./services/BroadcastService');
const AudioConversionService = require('./services/AudioConversionService');
const AudioStateManager = require('./services/AudioStateManager');
const WebSocketHandler = require('./websocket/WebSocketHandler');

// Import routes
const createHealthRoute = require('./routes/health');
const createEmergencyRoute = require('./routes/emergency');
const createConversionRoutes = require('./routes/conversion');
const createBroadcastRoutes = require('./routes/broadcast');
const testStreamRoute = require('./routes/testStream');

class BroadcastGateway {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Initialize services
    this.databaseService = new DatabaseService();
    this.audioStateManager = new AudioStateManager(this.databaseService);
    this.broadcastService = new BroadcastService(this.databaseService, this.audioStateManager);
    this.conversionService = new AudioConversionService(this.databaseService);
    
    this.init();
  }

  async init() {
    try {
      // Connect to database
      await this.databaseService.connect();
      
      // Start audio state manager cache cleanup
      this.audioStateManager.startCacheCleanup();
      
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
    this.app.use(createBroadcastRoutes(this.broadcastService));
    
    // Set up test stream route with live streaming capability
    const testStreamRoute = require('./routes/testStream');
    this.app.use(testStreamRoute);
    
    // Connect BroadcastService with test stream for live audio
    this.broadcastService.setTestStreamRoute(testStreamRoute);

    console.log('🌐 Express app configured with all routes');
  }

  startServer() {
    this.server.listen(config.PORT, () => {
      const isProduction = process.env.NODE_ENV === 'production';
      const host = isProduction ? 'production-server' : 'localhost';
      
      console.log(`🎙️ Broadcast Gateway listening on port ${config.PORT}`);
      console.log(`📡 HTTP API: http://${host}:${config.PORT}`);
      console.log(`🔌 WebSocket: ws://${host}:${config.PORT}`);
      console.log(`📡 Icecast target: ${config.ICECAST_HOST}:${config.ICECAST_PORT}${config.ICECAST_MOUNT}`);
      console.log(`🎵 Audio conversion service initialized`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
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
      
      // Dispose of audio state manager
      if (this.audioStateManager) {
        this.audioStateManager.dispose();
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