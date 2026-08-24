/**
 * Test Stream Route - Serves live audio stream for local testing
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');

const router = express.Router();

// Store active stream connections and live audio buffer
const activeStreams = new Set();
let liveAudioBuffer = null;
let audioStreamActive = false;

/**
 * Set live audio data from FFmpeg (called by BroadcastService)
 */
function setLiveAudioData(audioData) {
  if (!audioStreamActive) {
    console.log('📻 Live audio stream started');
    audioStreamActive = true;
  }
  
  // Broadcast to all connected clients immediately
  activeStreams.forEach(res => {
    try {
      if (!res.destroyed && res.writable) {
        res.write(audioData);
      } else {
        activeStreams.delete(res);
      }
    } catch (error) {
      console.warn('Error writing to stream client:', error.message);
      activeStreams.delete(res);
    }
  });
  
  // Keep a small buffer for new connections (last 64KB)
  liveAudioBuffer = audioData.length > 65536 ? audioData.slice(-65536) : audioData;
}

/**
 * Mark audio stream as inactive
 */
function stopLiveAudioStream() {
  audioStreamActive = false;
  liveAudioBuffer = null;
  
  // Close all active connections
  activeStreams.forEach(res => {
    try {
      if (!res.destroyed) {
        res.end();
      }
    } catch (error) {
      // Ignore errors when closing
    }
  });
  activeStreams.clear();
}

/**
 * GET /test-stream
 * Serves live audio stream for local testing
 */
router.get('/test-stream', (req, res) => {
  try {
    // Set headers for live audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    console.log('📻 Client connected to live test stream');
    
    // Add this connection to active streams
    activeStreams.add(res);
    
    // Handle client disconnect
    req.on('close', () => {
      console.log('📻 Client disconnected from test stream');
      activeStreams.delete(res);
    });
    
    req.on('error', () => {
      activeStreams.delete(res);
    });
    
    // If no live audio is active, wait for it to become active
    if (!audioStreamActive) {
      console.log('⏳ No live stream active yet - waiting for audio data...');
      
      let waitTime = 0;
      const maxWaitTime = 10000; // Wait up to 10 seconds
      const checkInterval = 100; // Check every 100ms
      
      const waitForAudio = setInterval(() => {
        waitTime += checkInterval;
        
        if (audioStreamActive) {
          // Audio stream is now active!
          clearInterval(waitForAudio);
          console.log('✅ Audio stream became active - sending buffered data');
          
          // Send any buffered audio data to client
          if (liveAudioBuffer) {
            try {
              res.write(liveAudioBuffer);
            } catch (error) {
              console.warn('Error sending buffer to client:', error.message);
              activeStreams.delete(res);
              return;
            }
          }
          
          console.log(`📻 Client ready for live stream (${activeStreams.size} total connections)`);
        } else if (waitTime >= maxWaitTime) {
          // Timeout - no audio stream started
          clearInterval(waitForAudio);
          console.log('❌ Audio stream timeout - no broadcast available');
          activeStreams.delete(res);
          
          if (!res.headersSent) {
            res.status(503).json({ 
              error: 'No live broadcast available',
              message: 'Please wait for the presenter to start broadcasting'
            });
          } else {
            res.end();
          }
        }
      }, checkInterval);
      
      return;
    }
    
    console.log('📻 Live stream active, client connected for real-time audio');
    
    // Send any buffered audio data to new client
    if (liveAudioBuffer) {
      try {
        res.write(liveAudioBuffer);
      } catch (error) {
        console.warn('Error sending buffer to new client:', error.message);
        activeStreams.delete(res);
        return;
      }
    }
    
    // Client is now connected and will receive live audio via setLiveAudioData
    console.log(`📻 Client ready for live stream (${activeStreams.size} total connections)`);
    
  } catch (error) {
    console.error('❌ Error serving test stream:', error);
    activeStreams.delete(res);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to serve test stream' });
    }
  }
});

/**
 * Get active stream connections count
 */
router.get('/test-stream/status', (req, res) => {
  res.json({
    activeConnections: activeStreams.size,
    liveStreamActive: audioStreamActive,
    message: `${activeStreams.size} active connection(s), live stream ${audioStreamActive ? 'active' : 'inactive'}`
  });
});

// Export functions for BroadcastService to use
router.setLiveAudioData = setLiveAudioData;
router.stopLiveAudioStream = stopLiveAudioStream;

module.exports = router;