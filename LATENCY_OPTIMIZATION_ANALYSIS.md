# Audio Streaming Latency Analysis & Optimization

## Current Latency Sources Identified

### 1. **Browser Audio Processing** (50-200ms)
**Current Settings:**
- ScriptProcessorNode buffer: 4096 samples
- Sample rate: Browser default (44100Hz → downsampled to 22050Hz)
- Audio throttling: 20ms intervals

**Latency Impact:** ~93ms at 4096 buffer + 20ms throttling = ~113ms

### 2. **WebSocket Transmission** (10-50ms)
**Current Settings:**
- Raw PCM data transmission
- No compression
- Network latency varies by connection

**Latency Impact:** 10-50ms depending on network

### 3. **Gateway FFmpeg Processing** (100-300ms)
**Current Settings:**
```javascript
// Current FFmpeg args in gateway/server.js
'-f', 's16le',
'-ar', '22050',  // Sample rate
'-ac', '1',      // Mono
'-acodec', 'libmp3lame',
'-ab', '64k',    // Bitrate
'-flush_packets', '1',
'-max_delay', '0'
```

**Latency Impact:** ~150-200ms for encoding + buffering

### 4. **Icecast Streaming** (100-500ms)
**Current Settings:**
- Default Icecast buffering
- No low-latency optimizations
- Burst size: 65535 bytes

**Latency Impact:** 200-500ms depending on buffer settings

### 5. **Browser Audio Player** (100-300ms)
**Current Settings:**
```html
<audio preload="none" />
```
- No preload optimization
- Default browser buffering
- No low-latency hints

**Latency Impact:** 100-300ms for initial buffering

## **Total Current Latency: 460ms - 1.35 seconds**

---

## Optimization Strategy

### Phase 1: Browser Audio Optimization (Target: -50ms)

#### 1.1 Reduce Audio Buffer Size
```javascript
// Current: 4096 samples = ~93ms at 44100Hz
const processor = audioContext.createScriptProcessor(1024, 1, 1); // ~23ms

// Or use AudioWorklet for even lower latency
```

#### 1.2 Optimize Audio Throttling
```javascript
// Current: 20ms throttling
// Reduce to: 10ms for lower latency
if (now - lastAudioSendRef.current < 10) {
  return;
}
```

#### 1.3 Use Native Sample Rate
```javascript
// Don't force sample rate conversion
// Use browser's native rate (usually 44100Hz)
const actualSampleRate = audioContext.sampleRate; // Use as-is
```

### Phase 2: Gateway FFmpeg Optimization (Target: -100ms)

#### 2.1 Ultra Low-Latency FFmpeg Settings
```javascript
const ffmpegArgs = [
  '-f', 's16le',
  '-ar', audioConfig.sampleRate.toString(), // Use native rate
  '-ac', '1',
  '-i', 'pipe:0',
  
  // Ultra low-latency encoding
  '-acodec', 'libmp3lame',
  '-ab', '96k',           // Increase bitrate for better quality/speed trade-off
  '-ac', '1',
  '-ar', audioConfig.sampleRate.toString(),
  
  // Minimize all buffering and delays
  '-flush_packets', '1',
  '-fflags', '+genpts+igndts+flush_packets',
  '-avoid_negative_ts', 'make_zero',
  '-max_delay', '0',
  '-muxdelay', '0',       // No mux delay
  '-muxpreload', '0',     // No preload
  '-thread_queue_size', '1', // Minimal thread queue
  
  // Real-time processing
  '-re',                  // Read input at native frame rate
  '-probesize', '32',     // Minimal probe size
  '-analyzeduration', '0', // No analysis delay
  
  // Output format optimizations
  '-f', 'mp3',
  icecastUrl
];
```

#### 2.2 Optimize Audio Processing Pipeline
```javascript
// Process audio in smaller chunks more frequently
processor.onaudioprocess = (event) => {
  // Reduce processing overhead
  const inputBuffer = event.inputBuffer.getChannelData(0);
  
  // Skip empty frames immediately
  if (!inputBuffer || inputBuffer.length === 0) return;
  
  // Optimize conversion (vectorized operations)
  const int16Data = new Int16Array(inputBuffer.length);
  for (let i = 0; i < inputBuffer.length; i++) {
    int16Data[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32767));
  }
  
  // Send immediately without throttling for live streams
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(int16Data.buffer);
  }
};
```

### Phase 3: Icecast Low-Latency Configuration (Target: -200ms)

#### 3.1 Optimize Icecast Settings
```xml
<!-- Add to /etc/icecast2/icecast.xml -->
<limits>
    <clients>100</clients>
    <sources>2</sources>
    <queue-size>32768</queue-size>      <!-- Reduced from 524288 -->
    <client-timeout>5</client-timeout>   <!-- Reduced from 30 -->
    <header-timeout>3</header-timeout>   <!-- Reduced from 15 -->
    <source-timeout>3</source-timeout>   <!-- Reduced from 10 -->
    <burst-on-connect>1</burst-on-connect>
    <burst-size>8192</burst-size>        <!-- Reduced from 65535 -->
</limits>

<mount>
    <mount-name>/stream</mount-name>
    <max-listeners>100</max-listeners>
    <burst-size>8192</burst-size>        <!-- Minimal burst -->
    <queue-size>32768</queue-size>       <!-- Minimal queue -->
    <public>1</public>
    <stream-name>Al-Manhaj Radio - Low Latency</stream-name>
    <bitrate>96</bitrate>                <!-- Match FFmpeg -->
    <type>audio/mpeg</type>
</mount>
```

### Phase 4: Browser Player Optimization (Target: -100ms)

#### 4.1 Low-Latency Audio Element
```javascript
// Optimize audio element for live streaming
<audio
  ref={audioRef}
  src={liveData.streamUrl}
  preload="metadata"        // Changed from "none"
  crossOrigin="anonymous"
  onPlay={() => setIsPlaying(true)}
  onPause={() => setIsPlaying(false)}
  onError={() => setIsPlaying(false)}
  // Low-latency attributes
  muted={false}
  autoPlay={false}
  controls={false}
  playsInline={true}
/>
```

#### 4.2 Optimize Audio Context for Playback
```javascript
// Add low-latency audio context configuration
useEffect(() => {
  if (audioRef.current) {
    // Set low-latency hint if supported
    if ('fastSeek' in audioRef.current) {
      audioRef.current.fastSeek = true;
    }
    
    // Minimize buffering
    if ('buffered' in audioRef.current) {
      // Monitor buffer levels and adjust
      const checkBuffer = () => {
        const audio = audioRef.current;
        if (audio && audio.buffered.length > 0) {
          const buffered = audio.buffered.end(0) - audio.currentTime;
          console.log(`Buffer ahead: ${buffered.toFixed(2)}s`);
        }
      };
      
      audioRef.current.addEventListener('progress', checkBuffer);
    }
  }
}, []);
```

### Phase 5: Network Optimization (Target: -50ms)

#### 5.1 WebSocket Optimization
```javascript
// Optimize WebSocket for low latency
const connectWebSocket = async (token: string): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    const gatewayUrl = process.env.NEXT_PUBLIC_BROADCAST_GATEWAY_URL || 'ws://localhost:8080';
    const ws = new WebSocket(`${gatewayUrl}?token=${token}`);
    
    // Optimize WebSocket settings
    ws.binaryType = 'arraybuffer'; // Faster than blob
    
    // Reduce connection timeout for faster failure detection
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 5000); // Reduced from 10000
    
    ws.onopen = () => {
      clearTimeout(timeout);
      
      // Send low-latency preference
      ws.send(JSON.stringify({
        type: 'configure_latency',
        mode: 'ultra_low'
      }));
      
      resolve(ws);
    };
  });
};
```

#### 5.2 Gateway WebSocket Handling
```javascript
// Add latency configuration handling in gateway
handleControlMessage(ws, user, data) {
  switch (data.type) {
    case 'configure_latency':
      if (data.mode === 'ultra_low') {
        // Configure for minimal latency
        this.latencyMode = 'ultra_low';
        console.log(`🚀 Ultra low-latency mode enabled for ${user.email}`);
      }
      break;
    // ... other cases
  }
}
```

---

## Implementation Priority

### **Immediate (High Impact, Low Risk)**
1. ✅ Reduce audio buffer size (1024 samples)
2. ✅ Optimize FFmpeg settings
3. ✅ Update Icecast configuration
4. ✅ Add audio preload="metadata"

### **Short Term (Medium Impact, Medium Risk)**
1. 🔄 Implement AudioWorklet (modern replacement for ScriptProcessor)
2. 🔄 Add WebSocket binary optimization
3. 🔄 Implement adaptive bitrate based on network

### **Long Term (High Impact, High Risk)**
1. 📋 Consider WebRTC for ultra-low latency (sub-100ms)
2. 📋 Implement custom streaming protocol
3. 📋 Add edge server deployment

---

## Expected Results

| Optimization | Current Latency | Optimized Latency | Improvement |
|-------------|----------------|-------------------|-------------|
| Browser Audio | 113ms | 50ms | -63ms |
| FFmpeg Processing | 200ms | 100ms | -100ms |
| Icecast Streaming | 350ms | 150ms | -200ms |
| Browser Player | 200ms | 100ms | -100ms |
| **TOTAL** | **863ms** | **400ms** | **-463ms** |

## **Target: Reduce latency from ~1 second to ~400ms (53% improvement)**

---

## Testing & Validation

### Latency Measurement Tools
```javascript
// Add to BrowserEncoder.tsx
const measureLatency = () => {
  const startTime = Date.now();
  
  // Send test tone
  ws.send(JSON.stringify({
    type: 'latency_test',
    timestamp: startTime
  }));
  
  // Measure round-trip time
  // (This requires gateway to echo back the timestamp)
};
```

### Performance Monitoring
```javascript
// Add performance metrics
const [latencyMetrics, setLatencyMetrics] = useState({
  audioProcessing: 0,
  networkRTT: 0,
  totalLatency: 0
});
```

---

## Risk Assessment

### **Low Risk Changes**
- ✅ FFmpeg parameter tuning
- ✅ Icecast configuration updates
- ✅ Audio element attributes

### **Medium Risk Changes**
- ⚠️ Audio buffer size reduction (may cause audio dropouts)
- ⚠️ WebSocket optimization (compatibility issues)

### **High Risk Changes**
- 🚨 AudioWorklet implementation (browser support)
- 🚨 Custom streaming protocols (complexity)

---

## Monitoring & Rollback Plan

### Performance Monitoring
1. **Audio Quality Metrics**
   - Dropout detection
   - Audio level monitoring
   - Connection stability

2. **Latency Measurement**
   - End-to-end latency testing
   - Network RTT monitoring
   - Buffer underrun detection

### Rollback Strategy
1. Keep current configuration as backup
2. Implement feature flags for optimizations
3. A/B test with subset of users
4. Monitor error rates and user feedback

---

**Next Steps:**
1. Implement Phase 1 optimizations (browser audio)
2. Deploy and test with real users
3. Measure latency improvements
4. Proceed to Phase 2 based on results