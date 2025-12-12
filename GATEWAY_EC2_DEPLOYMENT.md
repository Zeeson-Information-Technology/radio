# 🚀 Gateway Deployment on EC2

## Overview
This guide covers deploying the updated gateway server to EC2 after pushing changes to the main branch.

## Prerequisites
- Changes pushed to `main` branch
- SSH access to EC2 instance (98.93.42.61)
- EC2 instance has Node.js installed

## Deployment Steps

### 1. SSH into EC2 Instance
```bash
ssh ubuntu@98.93.42.61
```

### 2. Navigate to Project Directory
```bash
cd /opt/almanhaj-radio
# or wherever your project is located
```

### 3. Pull Latest Changes
```bash
git pull origin main
```

### 4. Navigate to Gateway Directory
```bash
cd gateway
```

### 5. Install Dependencies
```bash
npm install --production
```

### 6. Configure Environment Variables
Create or update the `.env` file:
```bash
sudo nano .env
```

Add the following configuration:
```bash
# Gateway Server Configuration
GATEWAY_PORT=8080
NODE_ENV=production

# JWT Authentication (MUST match Next.js app)
JWT_SECRET=hujfidreukj78jrekjhrehre8hfd

# MongoDB Connection (MUST match Next.js app)
MONGODB_URI=mongodb+srv://radio_user:okBJKJbtUS2KCTLE@cluster0.uiauf9o.mongodb.net/online-radio?retryWrites=true&w=majority

# Icecast Server Configuration (Same server - localhost)
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_PASSWORD=live-source-82736
ICECAST_MOUNT=/stream

# Next.js App URL (for notifying listeners)
NEXTJS_URL=https://almanhaj.vercel.app

# Logging
LOG_LEVEL=info

# Security
ALLOWED_ORIGINS=https://almanhaj.vercel.app
```

### 7. Test Gateway Connection
```bash
# Test if the gateway can start
node server.js
```

If successful, you should see:
```
📊 Connected to MongoDB
🎙️ Broadcast Gateway listening on port 8080
📡 Icecast target: localhost:8000/stream
```

Press `Ctrl+C` to stop the test.

### 8. Set Up as System Service (Recommended)

Create a systemd service file:
```bash
sudo nano /etc/systemd/system/almanhaj-gateway.service
```

Add this content:
```ini
[Unit]
Description=Al-Manhaj Radio Broadcast Gateway
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/almanhaj-radio/gateway
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable almanhaj-gateway
sudo systemctl start almanhaj-gateway
```

### 9. Verify Deployment

Check service status:
```bash
sudo systemctl status almanhaj-gateway
```

View logs:
```bash
sudo journalctl -u almanhaj-gateway -f
```

Check if port 8080 is listening:
```bash
sudo netstat -tlnp | grep 8080
```

Test WebSocket connection:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" http://localhost:8080
```

## Troubleshooting

### Gateway Won't Start
1. Check logs: `sudo journalctl -u almanhaj-gateway -n 20`
2. Verify MongoDB connection string
3. Ensure port 8080 is not in use: `sudo lsof -i :8080`

### Database Connection Issues
1. Test MongoDB URI from EC2:
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGODB_URI').then(() => console.log('Connected')).catch(err => console.error(err))"
```

### FFmpeg Not Found
Install FFmpeg if missing:
```bash
sudo apt update
sudo apt install ffmpeg
```

## Expected Result

Once deployed successfully:

1. **Gateway Status**: Running on port 8080
2. **Database Updates**: Gateway updates live state when broadcasts start/stop
3. **Session Persistence**: Admin page reload shows "Resume" button with correct timer
4. **Real-time Notifications**: Listeners get instant updates via Server-Sent Events

## Useful Commands

```bash
# Restart gateway
sudo systemctl restart almanhaj-gateway

# Stop gateway
sudo systemctl stop almanhaj-gateway

# View live logs
sudo journalctl -u almanhaj-gateway -f

# Check gateway status
sudo systemctl status almanhaj-gateway

# Test database connection
curl http://localhost:3000/api/live
```

## Security Notes

- Gateway runs on internal port 8080 (not exposed to internet)
- Only accepts WebSocket connections with valid JWT tokens
- MongoDB connection uses secure connection string
- CORS configured for Vercel domain only