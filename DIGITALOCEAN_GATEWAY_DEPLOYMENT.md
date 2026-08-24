# DigitalOcean Gateway Deployment Guide

## Overview
Deploy Al-Manhaj Radio Gateway to DigitalOcean Droplet ($6/mo). Gateway handles **two critical use cases**:

### Use Case 1: Audio Conversion
- Upload handler converts AMR/3GP/WMA → MP3 for browser playback
- Triggered by: Admin uploads unsupported format
- Flow: Upload API → Gateway conversion service → S3/Cloudinary

### Use Case 2: Live Radio Broadcasting  
- WebSocket server receives real-time audio from presenters
- FFmpeg encodes to MP3 stream
- Sends to Icecast for listener access
- Flow: Presenter browser → Gateway WebSocket → FFmpeg → Icecast → Listeners

---

## Prerequisites

1. **DigitalOcean Droplet Created**
   - Your existing droplet at `your-droplet-ip` (find in DigitalOcean dashboard)
   - Ubuntu 22.04 or similar
   - SSH access

2. **Local Machine Setup**
   - Git installed
   - SSH client (built-in on Mac/Linux, Windows 10+)

---

## Step 1: Access Your DigitalOcean Droplet

### Find Your Droplet IP
1. Go to https://cloud.digitalocean.com/
2. Click "Droplets" in sidebar
3. Note the IP address (e.g., `192.168.1.100`)

### SSH into Droplet
```bash
ssh root@your-droplet-ip
```

If prompted for password, use DigitalOcean-provided password.

Or if you set up SSH key:
```bash
ssh -i ~/.ssh/id_rsa root@your-droplet-ip
```

---

## Step 2: Set Up Gateway Directory

```bash
# Create gateway directory
mkdir -p /opt/almanhaj-gateway
cd /opt/almanhaj-gateway

# Initialize git (to clone or push from local)
git init

# Verify directory structure will include:
# - server.js (main gateway entry)
# - services/BroadcastService.js (live radio)
# - services/AudioConversionService.js (file conversion)
# - services/AudioStateManager.js (state tracking)
# - websocket/WebSocketHandler.js (real-time audio)
# - routes/* (conversion, broadcast, health endpoints)
# - .env (configuration)
```

---

## Step 3: Copy Gateway Files to Droplet

### Option A: Using Git (Recommended)
From your **local machine**:
```bash
cd radio  # Your project root
git remote add droplet ssh://root@your-droplet-ip/opt/almanhaj-gateway
git push droplet main --force  # Pushes entire repo
```

Then on **Droplet**:
```bash
cd /opt/almanhaj-gateway
git checkout -- .
```

### Option B: Using SCP (File Copy)
From your **local machine**:
```bash
# Copy entire gateway folder
scp -r gateway/ root@your-droplet-ip:/opt/almanhaj-gateway/

# Copy .env
scp gateway/.env root@your-droplet-ip:/opt/almanhaj-gateway/
```

---

## Step 4: Install Dependencies on Droplet

```bash
cd /opt/almanhaj-gateway

# Update system
apt update
apt upgrade -y

# Install Node.js (v20+ for async/await, WebSocket, etc.)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install FFmpeg (CRITICAL for audio conversion + live broadcast)
apt install -y ffmpeg

# Verify FFmpeg supports all codecs
ffmpeg -codecs | grep -E "libmp3lame|aac|flac|amr"

# Install gateway dependencies
npm install --production

# Verify all services can start
echo "✅ Dependencies installed"
```

---

## Step 5: Create Systemd Service

Create service file:
```bash
sudo nano /etc/systemd/system/almanhaj-gateway.service
```

Paste this:
```ini
[Unit]
Description=Al-Manhaj Radio Gateway Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/almanhaj-gateway
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, `Y`, `Enter`

Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable almanhaj-gateway
sudo systemctl start almanhaj-gateway

# Check status
sudo systemctl status almanhaj-gateway
```

---

## Step 6: Configure Firewall

```bash
# Allow gateway port (8080)
ufw allow 8080/tcp

# Allow Icecast port (8000)
ufw allow 8000/tcp

# Allow SSH (already done but verify)
ufw allow 22/tcp

# Enable firewall
ufw enable
```

---

## Step 7: Test Gateway

### From Your Local Machine
```bash
# Test health endpoint
curl http://your-droplet-ip:8080/health

# Expected response:
# {"status":"ok","database":"connected","streaming":false}
```

### Test Both Use Cases

**Use Case 1: Audio Conversion**
```bash
# Check conversion endpoint is accessible
curl http://your-droplet-ip:8080/convert-status

# Should return current conversion status
```

**Use Case 2: Live Radio**
```bash
# Test broadcast endpoint
curl -X GET http://your-droplet-ip:8080/api/broadcast/status

# Should return streaming status
# {"isStreaming": false, "currentBroadcast": null}
```

### From Droplet Logs
```bash
# Check all services initialized
sudo journalctl -u almanhaj-gateway -f

# Expected startup messages:
# ✅ Database connected
# ✅ Express app configured with all routes
# 🎙️ Broadcast Gateway listening on port 8080
# 📡 HTTP API: http://production-server:8080
# 🔌 WebSocket: ws://production-server:8080
# 📡 Icecast target: [icecast-ip]:8000/stream
# 🎵 Audio conversion service initialized
```

---

## Step 8: Update Frontend Configuration

### For Local Development (localhost gateway)
Update `.env.local`:
```env
# Use local gateway for testing
GATEWAY_URL=http://localhost:8080
NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://localhost:8080
```

### For Production Vercel (DigitalOcean gateway)
Go to Vercel dashboard → Project Settings → Environment Variables

Add/Update:
```
GATEWAY_URL=http://your-droplet-ip:8080
NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://your-droplet-ip:8080
```

**Note:** Use actual IP (e.g., `http://165.232.123.45:8080`) not domain, as Icecast must be accessible from browser.

---

## Step 9: Verify Both Use Cases Work

### Test Use Case 1: Audio Conversion
1. Go to admin panel
2. Upload an AMR file
3. Check Droplet logs:
   ```bash
   sudo journalctl -u almanhaj-gateway -f
   ```
4. Should see:
   ```
   🎵 Conversion: Adding job for recording [id]
   🎵 Conversion: Processing job [id]
   ✅ Conversion complete: amr → mp3
   ```
5. In admin panel: File should show as "ready for playback"

### Test Use Case 2: Live Radio Broadcasting
1. Go to live broadcast panel
2. Start broadcast (click "Go Live")
3. Check Droplet logs:
   ```bash
   sudo journalctl -u almanhaj-gateway -f
   ```
4. Should see:
   ```
   🎙️ startStreaming called for [user]
   📡 Starting FFmpeg process
   🎙️ Broadcasting active - accepting audio
   📊 Streaming status: ACTIVE
   ```
5. Open radio player: Should hear live stream
6. Stop broadcast: Should see `🛑 Stopping stream`

### If One Service Doesn't Work
**Audio Conversion failing?**
```bash
# Check FFmpeg
ffmpeg -version

# Check conversion logs
sudo journalctl -u almanhaj-gateway | grep -i conversion

# Restart service
sudo systemctl restart almanhaj-gateway
```

**Live Radio not working?**
```bash
# Check Icecast connectivity
curl -I http://localhost:8000/stream

# Check WebSocket
sudo netstat -tlnp | grep 8080

# Check FFmpeg processes
ps aux | grep ffmpeg
```

---

## Maintenance Commands

### Check Status
```bash
sudo systemctl status almanhaj-gateway
```

### View Logs
```bash
sudo journalctl -u almanhaj-gateway -f  # Real-time
sudo journalctl -u almanhaj-gateway -n 50  # Last 50 lines
```

### Restart Service
```bash
sudo systemctl restart almanhaj-gateway
```

### Stop Service
```bash
sudo systemctl stop almanhaj-gateway
```

### Update Gateway Code
```bash
cd /opt/almanhaj-gateway
git pull origin main
npm install --production
sudo systemctl restart almanhaj-gateway
```

---

## Troubleshooting

### "Connection refused" (port 8080)
```bash
# Check if service is running
sudo systemctl status almanhaj-gateway

# Check port is listening
sudo netstat -tlnp | grep 8080

# Restart if needed
sudo systemctl restart almanhaj-gateway
```

### "Database connection failed"
```bash
# Check MongoDB URI in gateway/.env
cat /opt/almanhaj-gateway/.env | grep MONGODB_URI

# Verify from droplet
curl -I mongodb+srv://... # Should not show DNS error
```

### "FFmpeg not found"
```bash
# Reinstall FFmpeg
apt install -y ffmpeg

# Verify
which ffmpeg
ffmpeg -version
```

### Gateway slow or times out
```bash
# Check system resources
free -h  # Memory
df -h    # Disk space
top      # CPU usage

# Restart if needed
sudo systemctl restart almanhaj-gateway
```

---

## Backup & Recovery

### Backup Gateway Configuration
```bash
# From droplet
tar -czf /tmp/gateway-backup.tar.gz /opt/almanhaj-gateway/

# Copy to local machine
scp root@your-droplet-ip:/tmp/gateway-backup.tar.gz ./

# Restore if needed
scp gateway-backup.tar.gz root@your-droplet-ip:/tmp/
# On droplet:
tar -xzf /tmp/gateway-backup.tar.gz -C /
```

---

## Cost

- **DigitalOcean Droplet:** $6/month (includes gateway + Icecast)
- **DigitalOcean Spaces:** $5/month (file storage) → Can be removed after Oct 17
- **Cloudinary:** Free (backup storage)
- **Vercel:** Free (frontend)
- **MongoDB Atlas:** Free (database)

**Total:** $6/month after Oct 17

---

## Next Steps

1. ✅ Deploy gateway to DigitalOcean Droplet
2. ✅ Test audio conversion
3. ✅ Verify browser playback
4. ✅ Update Vercel environment variables
5. Monitor logs for any issues

---

**Gateway Migration Complete!** 🚀
