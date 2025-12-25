/**
 * Broadcast control HTTP API routes
 * Handles mute, unmute, monitor, and audio injection commands
 */

const express = require('express');

function createBroadcastRoutes(broadcastService) {
  const router = express.Router();

  /**
   * Mute broadcast endpoint
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  router.post('/api/broadcast/mute', async (req, res) => {
    try {
      const { sessionId, timestamp } = req.body;
      
      // Get current broadcast
      const currentBroadcast = broadcastService.getCurrentBroadcast();
      if (!currentBroadcast) {
        return res.status(404).json({ error: 'No active broadcast session' });
      }

      // Mute the broadcast
      await broadcastService.muteBroadcast(currentBroadcast.ws, currentBroadcast.user);
      
      res.json({
        success: true,
        message: 'Broadcast muted successfully',
        sessionId,
        timestamp
      });

    } catch (error) {
      console.error('Mute broadcast error:', error);
      res.status(500).json({ error: 'Failed to mute broadcast' });
    }
  });

  /**
   * Unmute broadcast endpoint
   * Requirements: 2.5, 2.6
   */
  router.post('/api/broadcast/unmute', async (req, res) => {
    try {
      const { sessionId, timestamp } = req.body;
      
      // Get current broadcast
      const currentBroadcast = broadcastService.getCurrentBroadcast();
      if (!currentBroadcast) {
        return res.status(404).json({ error: 'No active broadcast session' });
      }

      // Unmute the broadcast
      await broadcastService.unmuteBroadcast(currentBroadcast.ws, currentBroadcast.user);
      
      res.json({
        success: true,
        message: 'Broadcast unmuted successfully',
        sessionId,
        timestamp
      });

    } catch (error) {
      console.error('Unmute broadcast error:', error);
      res.status(500).json({ error: 'Failed to unmute broadcast' });
    }
  });

  /**
   * Toggle monitor endpoint
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  router.post('/api/broadcast/monitor', async (req, res) => {
    try {
      const { enabled, timestamp } = req.body;
      
      // Get current broadcast
      const currentBroadcast = broadcastService.getCurrentBroadcast();
      if (!currentBroadcast) {
        return res.status(404).json({ error: 'No active broadcast session' });
      }

      // Toggle monitor
      await broadcastService.toggleMonitor(currentBroadcast.ws, currentBroadcast.user, enabled);
      
      res.json({
        success: true,
        message: `Audio monitoring ${enabled ? 'enabled' : 'disabled'}`,
        isMonitoring: Boolean(enabled),
        timestamp
      });

    } catch (error) {
      console.error('Monitor toggle error:', error);
      res.status(500).json({ error: 'Failed to toggle monitoring' });
    }
  });

  /**
   * Play audio file endpoint
   * Requirements: 3.1, 3.2, 3.7
   */
  router.post('/api/broadcast/audio/play', async (req, res) => {
    try {
      const { sessionId, fileId, fileName, duration, timestamp } = req.body;
      
      if (!fileId || !fileName || !duration) {
        return res.status(400).json({ 
          error: 'Missing required fields: fileId, fileName, duration' 
        });
      }

      // Get current broadcast
      const currentBroadcast = broadcastService.getCurrentBroadcast();
      if (!currentBroadcast) {
        return res.status(404).json({ error: 'No active broadcast session' });
      }

      // Start audio injection
      await broadcastService.injectAudio(currentBroadcast.ws, currentBroadcast.user, {
        fileId,
        fileName,
        duration: Number(duration)
      });
      
      res.json({
        success: true,
        message: 'Audio playback started successfully',
        fileId,
        fileName,
        duration: Number(duration),
        timestamp
      });

    } catch (error) {
      console.error('Audio playback error:', error);
      res.status(500).json({ error: 'Failed to start audio playback' });
    }
  });

  /**
   * Stop audio file endpoint
   * Requirements: 3.6
   */
  router.post('/api/broadcast/audio/stop', async (req, res) => {
    try {
      const { sessionId, timestamp } = req.body;
      
      // Get current broadcast
      const currentBroadcast = broadcastService.getCurrentBroadcast();
      if (!currentBroadcast) {
        return res.status(404).json({ error: 'No active broadcast session' });
      }

      // Stop audio injection
      await broadcastService.stopAudioInjection(currentBroadcast.ws, currentBroadcast.user);
      
      res.json({
        success: true,
        message: 'Audio playback stopped successfully',
        sessionId,
        timestamp
      });

    } catch (error) {
      console.error('Audio stop error:', error);
      res.status(500).json({ error: 'Failed to stop audio playback' });
    }
  });

  return router;
}

module.exports = createBroadcastRoutes;