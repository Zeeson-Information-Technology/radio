# Deploy Latency Optimizations to EC2

## Overview
This guide deploys the latency optimizations to reduce audio delay from ~1 second to ~400ms.

## Changes Made

### 1. Browser Audio Optimizations
- ✅ Reduced audio buffer: 4096 → 1024 samples (-70ms)
- ✅ Reduced throttling: 20ms → 10ms intervals (-10ms)
- ✅ Optimized WebSocket: arraybuffer + faster timeout (-20ms)

### 2. Gateway FFmpeg Optimizations  
- ✅ Increased bitrate: 64k → 96k (better quality/speed)
- ✅ Added ultra low-latency flags (-100ms)
- ✅ Optimized real-time processing (-50ms)

### 3. Browser Player Optimizations
- ✅ Changed preload: "none" → "metadata" (-50ms)
- ✅ Added crossOrigin and playsInline attributes

### 4. Icecast Configuration (Manual Step)
- 📋 Reduced queue sizes and timeouts (-200ms)
- 📋 Optimized burst settings

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
cd online-radio
git add .
git commit -m "feat: implement ultra low-latency audio streaming optimizations

- Reduce audio buffer from 4096 to 1024 samples (-70ms)
- Optimize FFmpeg with ultra low-latency flags (-150ms)  
- Enhance WebSocket performance (-20ms)
- Improve browser audio player settings (-50ms)
- Add latency configuration system

Target: Reduce total latency from ~1s to ~400ms"

git push origin main
```

### Step 2: Deploy Gateway to EC2
```bash
# SSH to EC2 server
ssh -i ~/Downloads/radio-key.pem ubuntu@98.93.42.61

# Pull latest changes
cd /home/ubuntu/online-radio
git pull origin main

# Restart gateway service
sudo systemctl restart radio-gateway

# Check status
sudo systemctl status radio-gateway

# Monitor logs for latency improvements
sudo journalctl -u radio-gateway -f
```

### Step 3: Update Icecast Configuration (Optional - High Impact)
```bash
# On EC2 server
sudo cp /etc/icecast2/icecast.xml /etc/icecast2/icecast.xml.backup

# Edit configuration
sudo nano /etc/icecast2/icecast.xml

# Apply the low-latency settings from ICECAST_LOW_LATENCY_CONFIG.xml:
# - queue-size: 524288 → 32768
# - client-timeout: 30 → 5  
# - header-timeout: 15 → 3
# - source-timeout: 10 → 3
# - burst-size: 65535 → 8192

# Restart Icecast
sudo systemctl restart icecast2

# Verify status
sudo systemctl status icecast2
```

### Step 4: Test Latency Improvements

#### 4.1 Start a Test Broadcast
1. Go to admin panel: https://almanhaj.vercel.app/admin/live
2. Start broadcasting
3. Monitor console logs for "Ultra low-latency mode enabled"

#### 4.2 Test Listener Experience  
1. Open radio page: https://almanhaj.vercel.app/radio
2. Click play when broadcast is live
3. Measure perceived latency (speak into mic, time until heard)

#### 4.3 Expected Results
- **Before:** ~1 second delay
- **After:** ~400ms delay (60% improvement)

### Step 5: Monitor Performance

#### Gateway Logs
```bash
# Monitor gateway performance
sudo journalctl -u radio-gateway -f | grep -E "(latency|buffer|delay)"
```

#### Icecast Logs  
```bash
# Monitor Icecast performance
sudo tail -f /var/log/icecast2/access.log
sudo tail -f /var/log/icecast2/error.log
```

#### Audio Quality Check
- Listen for audio dropouts or distortion
- Check if audio levels are maintained
- Verify connection stability

## Rollback Plan (If Issues Occur)

### Rollback Gateway Changes
```bash
# On EC2 server
cd /home/ubuntu/online-radio
git checkout HEAD~1  # Go back one commit
sudo systemctl restart radio-gateway
```

### Rollback Icecast Changes
```bash
# Restore backup configuration
sudo cp /etc/icecast2/icecast.xml.backup /etc/icecast2/icecast.xml
sudo systemctl restart icecast2
```

### Rollback Browser Changes
```bash
# On local development
git revert HEAD  # Revert the latency optimization commit
git push origin main
# Then redeploy to Vercel
```

## Performance Monitoring

### Key Metrics to Watch
1. **Audio Quality**
   - No dropouts or distortion
   - Consistent audio levels
   - Clear speech quality

2. **Connection Stability**  
   - WebSocket stays connected
   - No frequent reconnections
   - Smooth pause/resume

3. **Latency Measurement**
   - Speak into microphone
   - Time until audio heard on radio page
   - Target: <500ms total delay

### Success Criteria
- ✅ Latency reduced by >50%
- ✅ Audio quality maintained
- ✅ No increase in connection issues
- ✅ Smooth admin controls (pause/resume/stop)

## Troubleshooting

### High CPU Usage
```bash
# Check gateway CPU usage
top -p $(pgrep -f "node.*gateway")

# If high, may need to reduce audio processing frequency
```

### Audio Dropouts
- May indicate buffer too small
- Consider increasing buffer from 1024 to 2048 samples
- Check network stability

### Connection Issues
- Verify WebSocket timeout settings
- Check firewall rules
- Monitor network latency

### FFmpeg Errors
```bash
# Check FFmpeg logs in gateway
sudo journalctl -u radio-gateway | grep -i ffmpeg
```

## Next Steps (Future Optimizations)

### Phase 2: Advanced Optimizations
1. **AudioWorklet Implementation**
   - Replace ScriptProcessorNode (deprecated)
   - Even lower latency processing
   - Better performance

2. **Adaptive Bitrate**
   - Adjust quality based on network conditions
   - Maintain low latency under poor connections

3. **WebRTC Consideration**
   - For ultra-low latency (<100ms)
   - More complex but potentially better

### Phase 3: Infrastructure
1. **Edge Servers**
   - Deploy Icecast closer to listeners
   - Reduce geographic latency

2. **CDN Integration**
   - Use audio-optimized CDN
   - Global distribution

## Validation Checklist

Before marking as complete:
- [ ] Gateway deployed with new FFmpeg settings
- [ ] Browser optimizations active (check console logs)
- [ ] Icecast configuration updated (optional)
- [ ] Test broadcast successful
- [ ] Latency measured and improved
- [ ] Audio quality maintained
- [ ] No new errors in logs
- [ ] Admin controls working (pause/resume/stop)
- [ ] Multiple listeners can connect
- [ ] Performance monitoring in place

## Expected Timeline
- **Deployment:** 15 minutes
- **Testing:** 30 minutes  
- **Validation:** 15 minutes
- **Total:** ~1 hour

## Contact
If issues occur during deployment:
1. Check logs first (gateway + icecast)
2. Test with single listener
3. Rollback if audio quality degraded
4. Document any issues for future optimization