/**
 * Test Stream Route - Serves live audio stream for local testing
 */

const express = require('express');
const router = express.Router();

// Active listener connections waiting for or receiving audio
const activeStreams = new Set();

// In-memory state
let liveAudioBuffer = null;   // last 64KB of audio for catch-up
let audioStreamActive = false; // true once FFmpeg stdout has produced data
let broadcastIsLive = false;   // true once startStreaming() is called, false after stop

/**
 * Called by BroadcastService when broadcast starts (before FFmpeg produces audio)
 */
function setBroadcastLive(isLive) {
  broadcastIsLive = isLive;
  if (!isLive) {
    stopLiveAudioStream();
  }
  console.log(`📻 Broadcast live state: ${isLive}`);
}

/**
 * Called by BroadcastService when FFmpeg produces audio data
 */
function setLiveAudioData(audioData) {
  if (!audioStreamActive) {
    console.log('📻 First audio data received from FFmpeg - stream is live');
    audioStreamActive = true;
  }

  // Push chunk to all connected listeners immediately
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

  // Keep last 64KB as catch-up buffer for new connections
  liveAudioBuffer = audioData.length > 65536
    ? audioData.slice(-65536)
    : audioData;
}

/**
 * Called by BroadcastService when broadcast ends
 */
function stopLiveAudioStream() {
  audioStreamActive = false;
  broadcastIsLive = false;
  liveAudioBuffer = null;

  // Close all active listener connections
  activeStreams.forEach(res => {
    try {
      if (!res.destroyed) res.end();
    } catch (_) { /* ignore */ }
  });
  activeStreams.clear();
  console.log('📻 All listener connections closed');
}

/**
 * GET /test-stream
 *
 * - If no broadcast is live at all → 503 immediately
 * - If broadcast is live but FFmpeg hasn't produced data yet → hold the
 *   connection open (with audio/mpeg headers) and wait up to 15s for data
 * - If audio is already flowing → send catch-up buffer and keep streaming
 */
router.get('/test-stream', (req, res) => {
  // Hard reject if broadcast hasn't even started
  if (!broadcastIsLive) {
    console.log('⚠️ /test-stream hit but broadcast not live');
    return res.status(503).json({
      error: 'No live broadcast',
      message: 'Start a broadcast from the admin panel first, then try again.'
    });
  }

  // Broadcast IS live — commit to streaming headers now.
  // We do this before audio data arrives so the browser audio element
  // keeps the connection open and starts playing as soon as data flows.
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Transfer-Encoding', 'chunked');

  activeStreams.add(res);
  console.log(`📻 Listener connected (${activeStreams.size} total), audioStreamActive=${audioStreamActive}`);

  // Clean up when client disconnects
  req.on('close', () => {
    activeStreams.delete(res);
    console.log(`📻 Listener disconnected (${activeStreams.size} remaining)`);
  });
  req.on('error', () => activeStreams.delete(res));

  if (audioStreamActive) {
    // Audio already flowing — send catch-up buffer immediately
    if (liveAudioBuffer) {
      try {
        res.write(liveAudioBuffer);
      } catch (err) {
        console.warn('Error sending catch-up buffer:', err.message);
        activeStreams.delete(res);
      }
    }
    return;
  }

  // Audio not yet flowing — wait for FFmpeg to start producing data.
  // The connection is already open with audio/mpeg headers, so the browser
  // audio element will start playing automatically when data arrives via
  // the activeStreams set above.
  console.log('⏳ Waiting for FFmpeg to start producing audio data...');

  // Safety timeout: if no audio within 15s, close with a small silence sentinel
  // so the browser doesn't hang forever if FFmpeg never starts
  const timeout = setTimeout(() => {
    if (!audioStreamActive && !res.destroyed) {
      console.warn('⚠️ /test-stream: 15s timeout waiting for FFmpeg audio');
      activeStreams.delete(res);
      // End the response so the browser knows the stream is done
      try { res.end(); } catch (_) {}
    }
  }, 15000);

  req.on('close', () => clearTimeout(timeout));
});

/**
 * GET /test-stream/status — debugging
 */
router.get('/test-stream/status', (req, res) => {
  res.json({
    broadcastLive: broadcastIsLive,
    audioStreamActive,
    activeListeners: activeStreams.size,
    streamUrl: 'http://localhost:8080/test-stream',
    message: `Broadcast: ${broadcastIsLive ? 'LIVE' : 'OFF'}, Audio: ${audioStreamActive ? 'FLOWING' : 'WAITING'}, Listeners: ${activeStreams.size}`
  });
});

router.setLiveAudioData = setLiveAudioData;
router.stopLiveAudioStream = stopLiveAudioStream;
router.setBroadcastLive = setBroadcastLive;

module.exports = router;
