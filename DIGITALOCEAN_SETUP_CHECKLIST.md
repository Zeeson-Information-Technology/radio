# DigitalOcean Droplet Setup Checklist

## Pre-Deployment
- [ ] Find your Droplet IP in DigitalOcean dashboard
- [ ] Verify SSH access works: `ssh root@your-ip`
- [ ] Have gateway code ready locally

## Deployment Steps

### 1. Copy Gateway Files to Droplet
- [ ] SSH into Droplet: `ssh root@your-droplet-ip`
- [ ] Create directory: `mkdir -p /opt/almanhaj-gateway`
- [ ] Copy files (choose one method):
  - [ ] SCP: `scp -r gateway/ root@ip:/opt/almanhaj-gateway/`
  - [ ] Git push: Set up git remote and push

### 2. Install System Dependencies
- [ ] `apt update && apt upgrade -y`
- [ ] Install Node.js 20: Use NodeSource setup script
- [ ] Install FFmpeg: `apt install -y ffmpeg`
- [ ] Verify FFmpeg: `ffmpeg -version`

### 3. Install Node Dependencies
- [ ] `cd /opt/almanhaj-gateway`
- [ ] `npm install --production`

### 4. Create Systemd Service
- [ ] Create `/etc/systemd/system/almanhaj-gateway.service`
- [ ] Add service configuration (see deployment guide)
- [ ] `sudo systemctl daemon-reload`
- [ ] `sudo systemctl enable almanhaj-gateway`
- [ ] `sudo systemctl start almanhaj-gateway`

### 5. Configure Firewall
- [ ] `ufw allow 8080/tcp` (gateway port)
- [ ] `ufw allow 8000/tcp` (Icecast port)
- [ ] `ufw allow 22/tcp` (SSH)
- [ ] `ufw enable`

### 6. Verify Service Running
- [ ] `sudo systemctl status almanhaj-gateway`
- [ ] Check logs: `sudo journalctl -u almanhaj-gateway -n 20`

### 7. Test from Local Machine
- [ ] Health check: `curl http://your-ip:8080/health`
- [ ] Should return: `{"status":"ok",...}`

### 8. Update Frontend
- [ ] Update Vercel environment variables:
  - [ ] `GATEWAY_URL=http://your-droplet-ip:8080`
  - [ ] `NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://your-droplet-ip:8080`
- [ ] Redeploy Vercel: `git push`

### 9. Test Both Use Cases
- [ ] **Audio Conversion:**
  - [ ] Upload AMR file from admin panel
  - [ ] Check logs for conversion messages
  - [ ] Verify file plays in browser
  
- [ ] **Live Radio:**
  - [ ] Start live broadcast from presenter panel
  - [ ] Check logs for FFmpeg startup
  - [ ] Verify listeners can hear stream
  - [ ] Stop broadcast and verify cleanup

---

## Gateway Configuration Files

### `.env` (Gateway Environment)
```env
# Production settings
NODE_ENV=production
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=8080

# Database
MONGODB_URI=[your-atlas-connection]

# Icecast
ICECAST_HOST=0.0.0.0
ICECAST_PORT=8000

# Storage
AWS_ENDPOINT=https://lon1.digitaloceanspaces.com
AWS_ACCESS_KEY_ID=DO801PDKTMXXJJ8LGXGW
AWS_SECRET_ACCESS_KEY=[your-secret]

# CORS
ALLOWED_ORIGINS=https://almanhaj.vercel.app
```

### Gateway Services Included
- ✅ HTTP API (health checks, conversion status)
- ✅ WebSocket server (real-time audio)
- ✅ FFmpeg integration (audio encoding)
- ✅ Icecast streaming (broadcast)
- ✅ Audio conversion (AMR→MP3)
- ✅ Database integration
- ✅ State management

---

## Troubleshooting

### Gateway won't start
```bash
# Check service status
sudo systemctl status almanhaj-gateway

# View detailed logs
sudo journalctl -u almanhaj-gateway -f

# Check if port is in use
sudo lsof -i :8080

# Try manual start
cd /opt/almanhaj-gateway
node server.js
```

### Conversion not working
```bash
# Check FFmpeg installed
which ffmpeg

# Test FFmpeg directly
ffmpeg -version

# Check conversion queue
curl http://your-ip:8080/conversion-status
```

### Live radio not streaming
```bash
# Check Icecast accessible
curl -I http://localhost:8000/stream

# Check WebSocket connection
sudo journalctl -u almanhaj-gateway | grep -i websocket

# Check FFmpeg processes running
ps aux | grep ffmpeg
```

---

## Monitoring

### Regular Checks
```bash
# Every day
sudo systemctl status almanhaj-gateway
sudo journalctl -u almanhaj-gateway -n 50

# Weekly
df -h  # Disk space
free -h  # Memory usage
top  # CPU usage
```

### Restart Service
```bash
sudo systemctl restart almanhaj-gateway

# Wait for restart
sleep 5
sudo systemctl status almanhaj-gateway
```

---

## Backup

### Backup Gateway Code
```bash
tar -czf ~/gateway-backup-$(date +%Y%m%d).tar.gz /opt/almanhaj-gateway/
```

### Backup Configuration
```bash
cp /opt/almanhaj-gateway/.env ~/.env.backup
```

---

## Costs

| Service | Cost | Status |
|---------|------|--------|
| DigitalOcean Droplet | $6/mo | Active |
| DigitalOcean Spaces | $5/mo | Can delete Oct 17 |
| Cloudinary | Free | Active |
| Vercel | Free | Active |
| MongoDB Atlas | Free | Active |
| **Total** | **$6/mo** | After Oct 17 |

---

## Success Indicators

✅ Service starts automatically on reboot
✅ Health check returns status
✅ Audio conversions work
✅ Live radio broadcasts work
✅ Logs show no errors
✅ CPU/Memory usage reasonable

---

## Support

If stuck, check:
1. Deployment guide: `DIGITALOCEAN_GATEWAY_DEPLOYMENT.md`
2. Gateway logs: `sudo journalctl -u almanhaj-gateway -f`
3. System resources: `htop`
4. Network connectivity: `curl http://your-ip:8080/health`

Good luck! 🚀
