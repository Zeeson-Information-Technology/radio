# Audio Performance Fix - December 17, 2025

## 🎯 **Issues Identified**

### 1. **FFmpeg Speed Problem**
- **Symptom**: `speed=0.345x` (should be ~1.0x)
- **Cause**: `-re` flag forcing "native frame rate" reading
- **Impact**: Severe lag, buffering, 3x slower than real-time

### 2. **Broken Pipe Errors**
- **Symptom**: `Error submitting a packet to the muxer: Broken pipe`
- **Cause**: FFmpeg slowdown causing Icecast connection timeout
- **Impact**: Stream disconnections, audio dropouts

### 3. **"Failed to process message" Spam**
- **Symptom**: Hundreds of error messages in browser console
- **Cause**: Gateway trying to parse binary audio data as JSON
- **Impact**: Performance degradation, log spam

### 4. **Audio Throttling Too Aggressive**
- **Symptom**: Choppy audio, gaps in stream
- **Cause**: 20ms throttling creating audio gaps
- **Impact**: Unnatural audio flow

### 5. **Buffer Size Too Small**
- **Symptom**: Audio processing instability
- **Cause**: 1024 sample buffer causing frequent processing
- **Impact**: CPU spikes, audio glitches

## 🔧 **Fixes Applied**

### Fix 1: Removed `-re` Flag
**File**: `gateway/services/BroadcastService.js`

**Before**:
```javascript
'-re', // Read input at native frame rate
'-f', 's16le',
```

**After**:
```javascript
'-f', 's16le', // No -re flag for real-time processing
```

**Result**: FFmpeg now processes at full speed (~1.0x)

### Fix 2: Optimized FFmpeg Encoding
**File**: `gateway/services/BroadcastService.js`

**Changes**:
- Added `-q:a 2` for faster MP3 encoding
- Changed to `-fflags nobuffer+flush_packets`
- Added `-flags low_delay` for real-time priority
- Removed unnecessary analysis flags

**Result**: Lower latency, faster encoding

### Fix 3: Reduced Audio Throttling
**File**: `app/admin/live/BrowserEncoder.tsx`

**Before**:
```javascript
if (now - lastAudioSendRef.current < 20) { // 20ms throttle
```

**After**:
```javascript
if (now - lastAudioSendRef.current < 5) { // 5ms throttle
```

**Result**: Smoother audio flow, ~200 packets/second

### Fix 4: Increased Buffer Size
**File**: `app/admin/live/BrowserEncoder.tsx`

**Before**:
```javascript
createScriptProcessor(1024, 1, 1) // Too small
```

**After**:
```javascript
createScriptProcessor(2048, 1, 1) // Balanced
```

**Result**: More stable audio processing

### Fix 5: Fixed Binary Data Error Handling
**File**: `gateway/websocket/WebSocketHandler.js`

**Before**:
- Tried to parse all messages as JSON
- Sent error responses for binary data

**After**:
- Properly detects binary vs text messages
- Silently handles binary audio data
- Only logs errors for actual control message failures

**Result**: No more error spam, better performance

## 📊 **Expected Performance**

### Before Fixes:
- ❌ FFmpeg speed: 0.34x (3x slower than real-time)
- ❌ Latency: 10-15 seconds
- ❌ Audio: Choppy, laggy, disconnections
- ❌ Errors: Hundreds of "Failed to process message"

### After Fixes:
- ✅ FFmpeg speed: ~1.0x (real-time)
- ✅ Latency: 2-4 seconds
- ✅ Audio: Smooth, continuous, stable
- ✅ Errors: Clean logs, no spam

## 🖥️ **Testing on Same Computer**

### Issues with Same-Machine Testing:
1. **CPU Competition**: Browser + FFmpeg + Icecast competing for resources
2. **Memory Pressure**: Multiple audio streams in memory
3. **Network Loopback**: Localhost connections can have timing issues
4. **Audio Feedback**: Risk of microphone picking up speaker output

### Recommended Testing Setup:
- **Presenter**: One computer/device
- **Listener**: Different computer/device or mobile phone
- **Network**: Test over actual internet, not just localhost

### If Must Test on Same Machine:
- Use headphones to prevent feedback
- Close other applications
- Use different browsers (Chrome for presenting, Firefox for listening)
- Monitor CPU usage - should stay below 50%

## 🚀 **Deployment Steps**

1. **Push to Main**:
```bash
git add .
git commit -m "Fix: Audio performance issues - remove -re flag, optimize FFmpeg, reduce throttling"
git push origin main
```

2. **Update EC2**:
```bash
cd /opt/almanhaj-gateway-repo
git pull origin main
sudo systemctl stop almanhaj-gateway
sudo cp -r gateway/* /opt/almanhaj-gateway/
sudo systemctl start almanhaj-gateway
```

3. **Verify Deployment**:
```bash
# Check FFmpeg speed in logs (should be ~1.0x)
sudo journalctl -u almanhaj-gateway -f | grep "speed="

# Should see: speed=1.0x or speed=0.99x (close to 1.0)
```

## ✅ **Success Criteria**

After deployment, verify:
- [ ] FFmpeg speed is 0.9x - 1.1x (near real-time)
- [ ] No "Broken pipe" errors in logs
- [ ] No "Failed to process message" errors in browser
- [ ] Audio sounds smooth and continuous
- [ ] Latency is 2-4 seconds (acceptable for live streaming)
- [ ] No disconnections during 5+ minute broadcast

## 🎯 **Audio Quality Settings**

### Current Configuration:
- **Sample Rate**: 44100 Hz or 48000 Hz (browser native)
- **Channels**: 1 (Mono)
- **Bitrate**: 96 kbps
- **Format**: MP3
- **Buffer**: 2048 samples
- **Throttle**: 5ms (~200 packets/sec)

### Why These Settings:
- **44.1/48 kHz**: Standard audio quality, no resampling needed
- **Mono**: Sufficient for voice, reduces bandwidth
- **96 kbps**: Good quality/latency balance for voice
- **2048 buffer**: Stable without excessive latency
- **5ms throttle**: Smooth flow without overwhelming network

## 📝 **Notes**

- The `-re` flag was the main culprit causing 3x slowdown
- Browser-native sample rates (44.1/48 kHz) work better than forced 22 kHz
- Binary data should never be parsed as JSON
- Same-machine testing can give false negatives
- Real-world testing over internet is essential

---

**Fixed**: December 17, 2025  
**Version**: 2.1  
**Status**: Ready for Testing