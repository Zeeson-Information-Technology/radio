/**
 * Emergency stop route
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

function createEmergencyRoute(broadcastService) {
  router.post('/api/emergency-stop', authenticateToken, async (req, res) => {
    try {
      const { adminId, adminEmail, reason } = req.body;

      console.log(`🚨 Emergency stop received from admin: ${adminEmail}`);
      console.log(`📋 Reason: ${reason}`);

      const currentBroadcast = broadcastService.getCurrentBroadcast();

      // Force stop any active broadcast
      if (currentBroadcast) {
        console.log(`🛑 Terminating active broadcast by ${currentBroadcast.user.email}`);
        
        // Notify the broadcaster if still connected
        if (currentBroadcast.ws && currentBroadcast.ws.readyState === 1) {
          currentBroadcast.ws.send(JSON.stringify({
            type: 'emergency_stop',
            message: 'Broadcast terminated by administrator',
            stoppedBy: adminEmail,
            reason: reason
          }));
          currentBroadcast.ws.close();
        }

        // Stop the streaming
        await broadcastService.stopStreaming(null, currentBroadcast.user);
      }

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

  return router;
}

module.exports = createEmergencyRoute;