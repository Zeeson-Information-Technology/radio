# Audio Data Flow Diagnostic Guide

## Issue
Listeners get "Stream Unavailable" error when clicking play. Root cause: **Audio data is not flowing from presenter's browser to FFmpeg**.

## What Should Happen
1. Presenter clicks "Start Broadcasting"
2. Browser requests microphone permission
3. Audio processor starts firing continuously
4. Each audio chunk is converted to Int16 format and sent via WebSocket
5. Gateway receives audio data and writes it to FFmpeg stdin
6. FFmpeg encodes to MP3 and outputs to stdout
7. Test stream route receives MP3 data and broadcasts to listeners
8. Listener clicks "Listen" and receives MP3 stream

## What's Actually Happening
1. ✅ Presenter clicks "Start Broadcasting"
2. ✅ Browser requests microphone permission
3. ✅ FFmpeg process spawns
4. ✅ `stream_started` message sent to presenter
5. ❌ **No audio data arrives at gateway**
6. ❌ Test stream times out after 10 seconds
7. ❌ Listener gets 503 error

## Diagnostic Steps

### Step 1: Check Browser Console (Presenter Side)
Open browser DevTools (F12) and go to Console tab. Look for:

**Expected logs:**
```
✅ Audio graph connected. AudioContext state: running
🎤 Microphone stream active: true
🎤 Audio tracks: [{enabled: true, state: "live"}]
🎤 Audio processor firing: X calls/sec, WebSocket state: 1, AudioContext state: running
```

**If you see:**
- `WebSocket state: 0` → WebSocket is CONNECTING (not ready yet)
- `WebSocket state: 2` → WebSocket is CLOSING
- `WebSocket state: 3` → WebSocket is CLOSED
- `AudioContext state: suspended` → Audio context not running (need user interaction)
- `Audio tracks: [{enabled: false, ...}]` → Microphone is disabled

### Step 2: Check Gateway Logs
Look at the gateway console output. Expected logs:

**Expected:**
```
✅ FFmpeg process spawned
✅ Sent stream_started message to presenter
📊 Audio data flowing: 50 chunks received (X chunks/sec), buffer size: XXXX bytes
✍️ Audio data written to FFmpeg: 50 chunks (X chunks/sec), buffer size: XXXX bytes
```

**If you see:**
```
⏳ No live stream active yet - waiting for audio data...
❌ Audio stream timeout - no broadcast available
```
→ Audio data is NOT reaching the gateway

### Step 3: Check Network Tab (Presenter Side)
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for the WebSocket connection to `ws://localhost:8080`
4. Click on it and check:
   - Status: should be "101 Switching Protocols"
   - Messages tab: should show binary messages being sent continuously

**If you see:**
- No WebSocket connection → Connection failed
- WebSocket shows "closed" → Connection dropped
- No binary messages → Audio processor not sending data

## Common Issues and Fixes

### Issue 1: WebSocket Connection Fails
**Symptom:** WebSocket state is 3 (CLOSED) or connection never establishes

**Fix:**
1. Check gateway is running: `npm run dev` in gateway folder
2. Check firewall isn't blocking port 8080
3. Check `.env.local` has `NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://localhost:8080`

### Issue 2: Audio Processor Not Firing
**Symptom:** No "Audio processor firing" logs in console

**Fix:**
1. Check microphone permission is granted (microphone icon in address bar)
2. Check AudioContext state is "running" (not "suspended")
3. Try clicking on the page first (some browsers require user interaction)
4. Check browser console for permission errors

### Issue 3: Audio Data Sent But Not Received
**Symptom:** Browser logs show audio being sent, but gateway logs show no data

**Fix:**
1. Check WebSocket binary frame size (should be ~8KB chunks)
2. Check gateway is actually receiving the WebSocket connection
3. Restart gateway: `npm run dev` in gateway folder

### Issue 4: FFmpeg Not Receiving Data
**Symptom:** Gateway logs show audio data flowing, but FFmpeg doesn't start encoding

**Fix:**
1. Check FFmpeg is actually running: `ps aux | grep ffmpeg`
2. Check FFmpeg stdin is writable
3. Check FFmpeg error output in gateway logs

## How to Enable Full Debugging

### Browser Side (BrowserEncoder.tsx)
The logging is already enabled. Look for:
- 🎤 Audio processor logs
- 🔌 WebSocket state logs
- ✍️ Audio data send logs

### Gateway Side (WebSocketHandler.js & BroadcastService.js)
The logging is already enabled. Look for:
- 📊 Audio data received logs
- ✍️ Audio data written to FFmpeg logs
- ⚠️ Warning logs if something is wrong

## Testing Procedure

1. **Start Gateway:**
   ```bash
   cd gateway
   npm run dev
   ```

2. **Start Next.js:**
   ```bash
   npm run dev
   ```

3. **Open Admin Panel:**
   - Go to http://localhost:3000/admin/live
   - Login with admin credentials

4. **Start Broadcasting:**
   - Click "Start Broadcasting"
   - Check browser console for logs
   - Check gateway console for logs

5. **Check Audio Flow:**
   - Browser should show "Audio processor firing: X calls/sec"
   - Gateway should show "Audio data flowing: X chunks received"
   - Gateway should show "Audio data written to FFmpeg: X chunks"

6. **Test Listener:**
   - Open http://localhost:3000/radio in another tab
   - Click "Listen"
   - Should hear audio (or see it streaming in network tab)

## If Audio Data Still Doesn't Flow

1. Check if microphone is working in other apps
2. Try a different browser (Chrome, Firefox, Safari)
3. Check if browser has microphone permission for localhost
4. Try restarting both gateway and Next.js
5. Check if FFmpeg is installed: `ffmpeg -version`

## Next Steps

Once you've identified where the audio data is getting stuck, we can fix it:
- If WebSocket not connecting → Fix connection logic
- If audio processor not firing → Fix audio graph setup
- If data not sent → Fix WebSocket send logic
- If data not received → Fix gateway message handling
- If FFmpeg not receiving → Fix stdin write logic
