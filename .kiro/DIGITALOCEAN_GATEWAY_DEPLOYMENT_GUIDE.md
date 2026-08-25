# DigitalOcean Gateway Deployment Guide

Complete step-by-step guide to deploy the Al-Manhaj Radio gateway on a DigitalOcean Droplet.

## Prerequisites

### What You Need
- DigitalOcean account with an active Droplet
- SSH key configured on the Droplet
- Your local machine with SSH client
- Gateway code pushed to your repository (or ready to deploy)

### Droplet Requirements
- **OS**: Ubuntu 22.04 LTS or 24.04 LTS
- **Size**: Minimum $6/month (2GB RAM, 1 vCPU)
- **Region**: Any region (preferably close to your users)
- **Features**: IPv4 enabled, SSH key access

---

## Step 1: DigitalOcean Portal Setup

### 1.1 Create a Droplet (if not already done)

1. Log in to [DigitalOcean Dashboard](https://cloud.digitalocean.com)
2. Click **Create** → **Droplets**
3. Configure:
   - **OS Image**: Ubuntu 22.04 LTS (recommended)
   - **Plan**: Basic ($6/month) - 2GB RAM, 1 vCPU
   - **Region**: Choose closest to your location
   - **Authentication**: SSH key (recommended over password)
   - **Hostname**: `almanhaj-gateway` (optional but recommended)
4. Click **Create Droplet**
5. Wait for Droplet to start (1-2 minutes)
6. Note the Droplet IP address (shown in the control panel)

### 1.2 Configure Firewall (Security Group)

1. In DigitalOcean console, go to **Networking** → **Firewalls**
2. Click **Create Firewall**
3. Name: `almanhaj-gateway-firewall`
4. **Inbound Rules** - Add:
   - SSH (TCP port 22) - from anywhere or your IP only
   - HTTP (TCP port 80) - from anywhere
   - HTTPS (TCP port 443) - from anywhere
   - Custom TCP 8080 - from anywhere (Gateway API)
   - Custom TCP 8000 - from anywhere (Icecast stream)
5. **Outbound Rules** - Keep default (allow all)
6. Apply to your Droplet
7. Click **Create Firewall**

### 1.3 Configure Networking (Optional but Recommended)

1. Go to **Networking** → **Floating IPs**
2. Click **Reserve a Floating IP**
3. Assign to your gateway Droplet
4. This gives you a static IP even if Droplet restarts

---

## Step 2: Connect to Your Droplet

### 2.1 SSH Access (from your local machine)

```bash
# Use the Droplet IP (find it in DigitalOcean console)
ssh -i ~/.ssh/your-ssh-key.pem root@YOUR_DROPLET_IP

# Example:
ssh -i ~/.ssh/id_rsa root@192.168.1.1
```

If you get permission denied:
```bash
# Fix SSH key permissions
chmod 600 ~/.ssh/your-ssh-key.pem

# Try again
ssh -i ~/.ssh/your-ssh-key.pem root@YOUR_DROPLET_IP
```

### 2.2 Verify SSH Connection

Once connected, you should see:
```
root@almanhaj-gateway:~#
```

Update system packages:
```bash
apt update && apt upgrade -y
```

---

## Step 3: Install System Dependencies

Run these commands on your Droplet:

### 3.1 Install Node.js 20

```bash
# Install Node.js from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 3.2 Install FFmpeg

```bash
# Install FFmpeg for audio conversion
apt install -y ffmpeg

# Verify installation
ffmpeg -version
```

### 3.3 Install Icecast (Optional - for streaming)

```bash
# Install Icecast
apt install -y icecast2

# During installation, you'll be asked:
# "Configure icecast2?" → Yes
# "Hostname:" → Your droplet hostname or IP
# "Source password:" → Enter a strong password (save it!)
# "Relay password:" → Enter a password
# "Admin password:" → Enter a password

# Start Icecast
systemctl start icecast2
systemctl enable icecast2  # Auto-start on reboot

# Verify it's running
systemctl status icecast2
```

### 3.4 Install Other Tools

```bash
# Install process manager and other utilities
apt install -y git curl wget htop
```

---

## Step 4: Deploy Gateway Code

### 4.1 Clone or Copy Gateway Code

**Option A: Clone from Git**
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/almanhaj-radio.git
cd almanhaj-radio/gateway
```

**Option B: Copy via SCP (from your local machine)**
```bash
# On your local machine:
scp -i ~/.ssh/your-ssh-key.pem -r gateway/ root@YOUR_DROPLET_IP:/opt/almanhaj-gateway/
```

### 4.2 Install Node Dependencies

```bash
cd /opt/almanhaj-gateway  # or wherever you placed it
npm install --production
```

---

## Step 5: Configure Gateway Environment

### 5.1 Create .env File

```bash
# On your Droplet
nano /opt/almanhaj-gateway/.env
```

Add the following (replace YOUR_DROPLET_IP with actual IP):

```env
# Server Configuration
NODE_ENV=production
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=8080

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://radio_user:okBJKJbtUS2KCTLE@cluster0.uiauf9o.mongodb.net/online-radio?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=hujfidreukj78jrekjhrehre8hfd

# Icecast Configuration (for streaming)
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_MOUNT=/stream
ICECAST_PASSWORD=live-source-82736

# DigitalOcean Spaces (Audio Storage)
AWS_REGION=lon1
AWS_ENDPOINT=https://lon1.digitaloceanspaces.com
AWS_ACCESS_KEY_ID=[your-digitalocean-spaces-key]
AWS_SECRET_ACCESS_KEY=[your-digitalocean-spaces-secret]
AWS_S3_BUCKET=almanhaj-radio

# Frontend CORS
NEXTJS_URL=https://almanhaj.vercel.app
NEXTJS_API_URL=https://almanhaj.vercel.app
ALLOWED_ORIGINS=https://almanhaj.vercel.app

# Internal API Key
INTERNAL_API_KEY=gw_secure_2024_x9m8n7b6v5c4x3z2a1s9d8f7g6h5j4k3l2

# Audio Conversion
CONVERSION_TEMP_DIR=/tmp/audio-conversion
CONVERSION_MAX_CONCURRENT=2
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

### 5.2 Verify Configuration

```bash
# Check the file was created correctly
cat /opt/almanhaj-gateway/.env

# Create temp directory for conversion
mkdir -p /tmp/audio-conversion
chmod 777 /tmp/audio-conversion
```

---

## Step 6: Create Systemd Service

### 6.1 Create Service File

```bash
nano /etc/systemd/system/almanhaj-gateway.service
```

Add the following:

```ini
[Unit]
Description=Al-Manhaj Radio Gateway Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/almanhaj-gateway
ExecStart=/usr/bin/node /opt/almanhaj-gateway/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings (optional)
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 6.2 Enable and Start Service

```bash
# Reload systemd daemon
systemctl daemon-reload

# Enable service to auto-start on reboot
systemctl enable almanhaj-gateway

# Start the service
systemctl start almanhaj-gateway

# Check status
systemctl status almanhaj-gateway
```

### 6.3 View Logs

```bash
# Real-time logs
journalctl -u almanhaj-gateway -f

# Last 50 lines
journalctl -u almanhaj-gateway -n 50

# Errors only
journalctl -u almanhaj-gateway -p err
```

---

## Step 7: Test Gateway Connectivity

### 7.1 Test from Droplet

```bash
# Health check
curl http://localhost:8080/health

# Should return something like:
# {"ok":true,"status":"ready","timestamp":"2026-08-24T..."}
```

### 7.2 Test from Your Local Machine

```bash
# Replace YOUR_DROPLET_IP with actual IP
curl http://YOUR_DROPLET_IP:8080/health

# Test conversion status
curl http://YOUR_DROPLET_IP:8080/conversion-status

# Test WebSocket (install wscat first if needed)
# npm install -g wscat
# wscat -c ws://YOUR_DROPLET_IP:8080
```

### 7.3 Test Icecast Stream

```bash
# From your local machine, test stream endpoint
curl -I http://YOUR_DROPLET_IP:8000/stream

# Should return HTTP/1.0 200 OK (or similar)
```

---

## Step 8: Update Frontend Configuration

### 8.1 Update Vercel Environment Variables

1. Log in to [Vercel Dashboard](https://vercel.com)
2. Select your `almanhaj` project
3. Go to **Settings** → **Environment Variables**
4. Update or create:

| Variable | Value |
|----------|-------|
| `GATEWAY_URL` | `http://YOUR_DROPLET_IP:8080` |
| `NEXT_PUBLIC_BROADCAST_GATEWAY_URL` | `ws://YOUR_DROPLET_IP:8080` |
| `STREAM_URL` | `http://YOUR_DROPLET_IP:8000/stream` |
| `NEXT_PUBLIC_STREAM_URL` | `http://YOUR_DROPLET_IP:8000/stream` |

5. Redeploy: `git push` to trigger new build

### 8.2 Test Frontend Connection

1. Go to https://almanhaj.vercel.app/radio
2. Open browser console (F12)
3. Check for any connection errors
4. Try playing the stream

---

## Step 9: Monitor and Maintain

### 9.1 Regular Monitoring

```bash
# Check service status
systemctl status almanhaj-gateway

# Check system resources
free -h        # Memory usage
df -h          # Disk space
top            # CPU usage

# Check if ports are listening
netstat -tlnp | grep LISTEN
```

### 9.2 Restart Service

```bash
# Restart gateway
systemctl restart almanhaj-gateway

# Wait for restart
sleep 3
systemctl status almanhaj-gateway
```

### 9.3 View Error Logs

```bash
# If service won't start, check logs
journalctl -u almanhaj-gateway -p err -n 20

# Try manual start to see errors
cd /opt/almanhaj-gateway
node server.js
```

---

## Troubleshooting

### Gateway Won't Start

```bash
# Check Node.js installed
which node

# Check file permissions
ls -la /opt/almanhaj-gateway/

# Try manual start
cd /opt/almanhaj-gateway
node server.js

# Check for port conflicts
lsof -i :8080
```

### Icecast Not Streaming

```bash
# Check Icecast running
systemctl status icecast2

# Check Icecast config
cat /etc/icecast2/icecast.xml

# Test Icecast port
curl -I http://localhost:8000/

# Restart Icecast
systemctl restart icecast2
```

### Cannot Connect from Frontend

```bash
# Check firewall allows port 8080
ufw status

# If needed, open ports
ufw allow 8080/tcp
ufw allow 8000/tcp

# Restart ufw
ufw reload

# Test connectivity from local machine
curl http://YOUR_DROPLET_IP:8080/health
```

### Audio Conversion Issues

```bash
# Check FFmpeg installed
which ffmpeg
ffmpeg -version

# Check temp directory
ls -la /tmp/audio-conversion

# Check disk space
df -h

# Check MongoDB connection
curl http://YOUR_DROPLET_IP:8080/conversion-status
```

---

## Security Best Practices

### 1. SSH Security
```bash
# Disable password login (only SSH key)
nano /etc/ssh/sshd_config

# Set these values:
# PasswordAuthentication no
# PermitRootLogin prohibit-password

# Restart SSH
systemctl restart sshd
```

### 2. Firewall Configuration
```bash
# Enable UFW firewall
ufw enable

# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8080/tcp  # Gateway API
ufw allow 8000/tcp  # Icecast
```

### 3. Regular Updates
```bash
# Update system weekly
apt update && apt upgrade -y

# Check for security updates
apt list --upgradable
```

### 4. Backup Configuration
```bash
# Backup .env file
cp /opt/almanhaj-gateway/.env ~/.env.backup

# Backup full gateway
tar -czf ~/gateway-backup-$(date +%Y%m%d).tar.gz /opt/almanhaj-gateway/
```

---

## Cost Tracking

| Service | Cost | Status |
|---------|------|--------|
| DigitalOcean Droplet ($6/mo) | $6.00 | ✅ Required |
| DigitalOcean Spaces ($5/mo) | $5.00 | ✅ Required |
| Floating IP (optional) | Free | Optional |
| Bandwidth (750GB free/mo) | $0.00 | ✅ Usually free |
| **Total** | **$11/mo** | ✅ |

---

## Verification Checklist

- [ ] Droplet created and accessible via SSH
- [ ] Firewall rules configured
- [ ] Node.js and FFmpeg installed
- [ ] Icecast installed and running
- [ ] Gateway code deployed
- [ ] `.env` file configured with correct credentials
- [ ] Systemd service created and running
- [ ] Health check returns 200 OK
- [ ] Vercel environment variables updated
- [ ] Frontend can connect to gateway
- [ ] Stream endpoint accessible
- [ ] Audio conversion working

---

## Support Commands

```bash
# Gateway status
systemctl status almanhaj-gateway

# View recent logs
journalctl -u almanhaj-gateway -n 50

# Test health endpoint
curl http://localhost:8080/health

# Check listening ports
netstat -tlnp

# Restart all services
systemctl restart almanhaj-gateway
systemctl restart icecast2

# SSH into Droplet
ssh -i ~/.ssh/id_rsa root@YOUR_DROPLET_IP
```

---

## Next Steps

After deployment:

1. ✅ Gateway is running and accepting connections
2. ✅ Audio files can be injected into the stream
3. ✅ Listeners can access the stream from browsers
4. ⏭️ **Next**: Implement audio file injection API
5. ⏭️ **Then**: Enhance radio player UI with file controls
6. ⏭️ **Finally**: Add stream health monitoring

Happy streaming! 🎙️🎵
