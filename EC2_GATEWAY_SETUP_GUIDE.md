# 🚀 Complete EC2 Gateway Setup & Deployment Guide

## Step 1: SSH into EC2 Instance

Open your terminal/PowerShell and run:

```bash
ssh ubuntu@98.93.42.61
```

**Expected output:**
```
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-1234-aws x86_64)
ubuntu@ip-172-31-xx-xx:~$
```

If you get a "Permission denied" error, you need to set up SSH keys first. See troubleshooting section below.

---

## Step 2: Navigate to Project Directory

Once logged in, navigate to where the project is located:

```bash
cd /opt/almanhaj-radio
```

Or if it's in a different location:
```bash
ls -la /opt/
# Find the correct directory
```

**Verify you're in the right place:**
```bash
ls -la
```

You should see folders like: `app`, `gateway`, `lib`, `public`, `.git`, etc.

---

## Step 3: Pull Latest Changes from Main Branch

```bash
git pull origin main
```

**Expected output:**
```
remote: Enumerating objects: XX, done.
remote: Counting objects: 100% (XX/XX), done.
Unpacking objects: 100% (XX/XX), done.
From github.com:your-repo/online-radio
   abc1234..def5678  main       -> origin/main
Updating abc1234..def5678
Fast-forward
 gateway/server.js | XX ++++++++++
 ...
```

---

## Step 4: Navigate to Gateway Directory

```bash
cd gateway
```

**Verify:**
```bash
ls -la
```

You should see: `server.js`, `package.json`, `.env.example`

---

## Step 5: Install Gateway Dependencies

```bash
npm install --production
```

**Expected output:**
```
added 60 packages, and audited 61 packages in 25s
found 0 vulnerabilities
```

---

## Step 6: Create and Configure .env File

### Option A: Using nano editor (Recommended)

```bash
nano .env
```

This opens the nano text editor. Now copy and paste the following configuration:

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

**To save and exit nano:**
1. Press `Ctrl + X`
2. Press `Y` (for yes)
3. Press `Enter` (to confirm filename)

### Option B: Using cat command (Alternative)

```bash
cat > .env << 'EOF'
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
EOF
```

**Verify the file was created:**
```bash
cat .env
```

---

## Step 7: Test Gateway Connection

Before setting up as a service, test if the gateway starts correctly:

```bash
node server.js
```

**Expected output:**
```
📊 Connected to MongoDB
🎙️ Broadcast Gateway listening on port 8080
📡 Icecast target: localhost:8000/stream
```

If you see this, the gateway is working! Press `Ctrl + C` to stop it.

**If you get errors:**
- Check MongoDB connection: Verify the MONGODB_URI is correct
- Check JWT_SECRET: Make sure it matches the Next.js app
- Check port 8080: Make sure it's not already in use

---

## Step 8: Set Up Gateway as System Service (Recommended)

This ensures the gateway automatically starts and restarts if it crashes.

### Create the service file:

```bash
sudo nano /etc/systemd/system/almanhaj-gateway.service
```

Copy and paste this content:

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

**Save and exit:**
1. Press `Ctrl + X`
2. Press `Y`
3. Press `Enter`

### Enable and start the service:

```bash
sudo systemctl daemon-reload
```

```bash
sudo systemctl enable almanhaj-gateway
```

```bash
sudo systemctl start almanhaj-gateway
```

---

## Step 9: Verify Gateway is Running

### Check service status:

```bash
sudo systemctl status almanhaj-gateway
```

**Expected output:**
```
● almanhaj-gateway.service - Al-Manhaj Radio Broadcast Gateway
     Loaded: loaded (/etc/systemd/system/almanhaj-gateway.service; enabled; vendor preset: enabled)
     Active: active (running) since Fri 2025-12-12 15:30:00 UTC
```

### View live logs:

```bash
sudo journalctl -u almanhaj-gateway -f
```

Press `Ctrl + C` to exit logs.

### Check if port 8080 is listening:

```bash
sudo netstat -tlnp | grep 8080
```

**Expected output:**
```
tcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN      1234/node
```

---

## Step 10: Test the Gateway

### From EC2, test the API endpoint:

```bash
curl http://localhost:3000/api/live
```

**Expected output:**
```json
{
  "ok": true,
  "isLive": false,
  "isPaused": false,
  "title": null,
  "lecturer": null,
  "startedAt": null,
  "pausedAt": null,
  "streamUrl": "http://98.93.42.61:8000/stream"
}
```

### Test WebSocket connection:

```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" http://localhost:8080
```

---

## Step 11: Verify Everything Works

### From your local machine, test the broadcast:

1. Go to: `https://almanhaj.vercel.app/admin/live`
2. Click "Start Broadcasting"
3. Allow microphone access
4. Check if the broadcast starts

### Check database was updated:

From EC2:
```bash
curl http://localhost:3000/api/live
```

Should now show:
```json
{
  "ok": true,
  "isLive": true,
  "isPaused": false,
  "title": "Live Lecture",
  "lecturer": "your-email@example.com",
  "startedAt": "2025-12-12T15:35:00.000Z",
  ...
}
```

### Test persistence (the main fix):

1. Start a broadcast from admin panel
2. Reload the admin page
3. You should see "Resume" button with timer continuing ✅

---

## Useful Commands for Future Reference

### View gateway logs:
```bash
sudo journalctl -u almanhaj-gateway -f
```

### Restart gateway:
```bash
sudo systemctl restart almanhaj-gateway
```

### Stop gateway:
```bash
sudo systemctl stop almanhaj-gateway
```

### Start gateway:
```bash
sudo systemctl start almanhaj-gateway
```

### Check gateway status:
```bash
sudo systemctl status almanhaj-gateway
```

### View last 50 log lines:
```bash
sudo journalctl -u almanhaj-gateway -n 50
```

### Check if port 8080 is in use:
```bash
sudo lsof -i :8080
```

### Update gateway code (after pushing to main):
```bash
cd /opt/almanhaj-radio
git pull origin main
cd gateway
npm install --production
sudo systemctl restart almanhaj-gateway
```

---

## Troubleshooting

### "Permission denied (publickey)"
You need SSH keys set up. Contact your AWS administrator or:
1. Generate SSH key locally
2. Add public key to EC2 instance
3. Use private key to connect

### "Cannot find module 'mongoose'"
Run: `npm install --production`

### "EADDRINUSE: address already in use :::8080"
Port 8080 is already in use. Either:
1. Kill the process: `sudo lsof -i :8080` then `sudo kill -9 <PID>`
2. Change GATEWAY_PORT in .env

### "MongoDB connection failed"
1. Verify MONGODB_URI is correct
2. Check if MongoDB Atlas allows connections from EC2 IP
3. Test connection: `node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_URI').then(() => console.log('Connected')).catch(err => console.error(err))"`

### "Gateway starts but no logs"
Check logs: `sudo journalctl -u almanhaj-gateway -n 20`

### "WebSocket connection fails"
1. Verify gateway is running: `sudo systemctl status almanhaj-gateway`
2. Check port 8080: `sudo netstat -tlnp | grep 8080`
3. Check firewall: `sudo ufw status`

---

## Success Checklist

- [ ] SSH into EC2 successfully
- [ ] Pulled latest code from main
- [ ] Installed npm dependencies
- [ ] Created .env file with correct values
- [ ] Tested gateway with `node server.js`
- [ ] Set up as systemd service
- [ ] Gateway is running (`sudo systemctl status almanhaj-gateway`)
- [ ] Port 8080 is listening
- [ ] `/api/live` endpoint returns correct data
- [ ] Admin can start broadcast
- [ ] Database updates when broadcast starts
- [ ] Admin page reload shows "Resume" button ✅

---

## Next Steps

Once the gateway is deployed and working:

1. **Test persistence**: Start broadcast → Reload page → Should show Resume button
2. **Monitor logs**: `sudo journalctl -u almanhaj-gateway -f`
3. **Test with listeners**: Have someone join the radio page while broadcasting
4. **Verify notifications**: Check if listeners get real-time updates

Your Islamic radio is now fully operational with persistent sessions! 🎙️📻