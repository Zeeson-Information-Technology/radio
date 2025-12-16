/**
 * Health check route
 */

const express = require('express');
const router = express.Router();

function createHealthRoute(broadcastService) {
  router.get('/health', (req, res) => {
    const streamingStatus = broadcastService.getStreamingStatus();
    
    res.json({
      status: 'ok',
      services: {
        websocket: 'active', // WebSocket server is always active if this responds
        conversion: 'active',
        icecast: streamingStatus.isStreaming ? 'connected' : 'disconnected'
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

module.exports = createHealthRoute;