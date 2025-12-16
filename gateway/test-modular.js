#!/usr/bin/env node

/**
 * Test script to verify modular structure works
 */

console.log('🧪 Testing modular structure...');

try {
  // Test config loading
  const config = require('./config');
  console.log('✅ Config loaded successfully');
  console.log(`   PORT: ${config.PORT}`);
  console.log(`   ICECAST_HOST: ${config.ICECAST_HOST}`);

  // Test middleware loading
  const { authenticateToken, verifyWebSocketClient } = require('./middleware/auth');
  console.log('✅ Auth middleware loaded successfully');

  // Test services loading (without instantiation to avoid DB connection)
  const DatabaseService = require('./services/DatabaseService');
  const BroadcastService = require('./services/BroadcastService');
  const AudioConversionService = require('./services/AudioConversionService');
  console.log('✅ Services loaded successfully');

  // Test routes loading
  const createHealthRoute = require('./routes/health');
  const createEmergencyRoute = require('./routes/emergency');
  const createConversionRoutes = require('./routes/conversion');
  console.log('✅ Routes loaded successfully');

  // Test WebSocket handler loading
  const WebSocketHandler = require('./websocket/WebSocketHandler');
  console.log('✅ WebSocket handler loaded successfully');

  console.log('🎉 All modules loaded successfully! Modular structure is working.');
  
} catch (error) {
  console.error('❌ Module loading failed:', error);
  process.exit(1);
}