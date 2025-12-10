# 🎙️ Broadcast Gateway Setup Guide

This guide will help you set up the Al-Manhaj Radio Broadcast Gateway on your EC2 instance, enabling browser-based streaming directly to Icecast.

## 📋 **Prerequisites**

- EC2 instance with Ubuntu 20.04+ (same server as Icecast)
- Icecast2 already installed and running
- Node.js 18+ installed
- FFmpeg installed
- Domain/subdomain for the gateway (e.g., `stream.almanhaj.duckdns.org`)

---

## 🚀 **Installation Steps**

### **Step 1: Install Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt install -y ffmpeg

# Verify installations
node --version  # Should be v18+
ffmpeg -version # Should show FFmpeg version
```

### **Step 2: Create Gateway Directory**

```bash
# Create application directory
sudo mkdir -p /opt/almanhaj-gateway
sudo chown ubuntu:ubuntu /opt/almanhaj-gateway
cd /opt/almanhaj-gateway

# Copy gateway files from your repository
# (Upload server.js, package.json, .env files)
```

### **Step 3: Install Node.js Dependencies**

```bash
cd /opt/almanhaj-gateway
npm install
```

### **Step 4: Configure Environment Variables**

```bash
# Create environment file
cp .env.example .env
nano .env
```

**Edit `.env` file:**
```bash
# Gateway Configuration
GATEWAY_PORT=8080
NODE_ENV=production

# JWT Secret (MUST match your Next.js app)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Icecast Configuration
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_PASSWORD=your-icecast-source-password
ICECAST_MOUNT=/stream

# Security
ALLOWED_ORIGINS=https://your-radio-app.vercel.app
```

### **Step 5: Test the Gateway**

```bash
# Test run
npm start

# You should see:
# 🎙️ Broadcast Gateway listening on port 8080
# 📡 Icecast target: localhost:8000/stream
```

### **Step 6: Setup Systemd Service**

```bash
# Copy service file
sudo cp almanhaj-gateway.service /etc/systemd/system/

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable almanhaj-gateway
sudo systemctl start almanhaj-gateway

# Check status
sudo systemctl status almanhaj-gateway
```

### **Step 7: Configure Nginx (SSL & WebSocket)**

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/gateway
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name stream.almanhaj.duckdns.org;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name stream.almanhaj.duckdns.org;
    
    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/stream.almanhaj.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stream.almanhaj.duckdns.org/privkey.pem;
    
    # WebSocket proxy to gateway
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket timeout settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Step 8: Setup SSL Certificate**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d stream.almanhaj.duckdns.org

# Test auto-renewal
sudo certbot renew --dry-run
```

### **Step 9: Configure Firewall**

```bash
# Allow necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp  # Gateway port (internal)

# Check firewall status
sudo ufw status
```

---

## 🔧 **Configuration**

### **Environment Variables**

| Variable | Description | Example |
|----------|-------------|---------|
| `GATEWAY_PORT` | Port for WebSocket server | `8080` |
| `JWT_SECRET` | JWT signing secret (must match Next.js) | `your-secret-key` |
| `ICECAST_HOST` | Icecast server hostname | `localhost` |
| `ICECAST_PORT` | Icecast server port | `8000` |
| `ICECAST_PASSWORD` | Icecast source password | `your-password` |
| `ICECAST_MOUNT` | Icecast mount point | `/stream` |

### **Next.js Environment Variables**

Add to your Vercel environment variables:

```bash
NEXT_PUBLIC_GATEWAY_URL=wss://stream.almanhaj.duckdns.org
JWT_SECRET=your-super-secure-jwt-secret-key-here
```

---

## 🧪 **Testing**

### **Test 1: Gateway Connection**

```bash
# Check if gateway is running
curl -I http://localhost:8080

# Check WebSocket upgrade
wscat -c ws://localhost:8080
```

### **Test 2: SSL & Domain**

```bash
# Test HTTPS
curl -I https://stream.almanhaj.duckdns.org

# Test WebSocket over SSL
wscat -c wss://stream.almanhaj.duckdns.org
```

### **Test 3: End-to-End Streaming**

1. Open your Next.js admin panel
2. Go to `/admin/live`
3. Click "Start Broadcasting" in browser encoder
4. Allow microphone access
5. Speak into microphone
6. Check Icecast admin panel for active source
7. Test listening on `/radio` page

---

## 📊 **Monitoring**

### **Service Status**

```bash
# Check gateway service
sudo systemctl status almanhaj-gateway

# View logs
sudo journalctl -u almanhaj-gateway -f

# Check resource usage
htop
```

### **Log Files**

```bash
# Gateway logs
sudo journalctl -u almanhaj-gateway --since "1 hour ago"

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Icecast logs
sudo tail -f /var/log/icecast2/access.log
sudo tail -f /var/log/icecast2/error.log
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Gateway Won't Start**
```bash
# Check port availability
sudo netstat -tlnp | grep 8080

# Check permissions
ls -la /opt/almanhaj-gateway/

# Check environment file
cat /opt/almanhaj-gateway/.env
```

#### **WebSocket Connection Failed**
```bash
# Check Nginx configuration
sudo nginx -t

# Check SSL certificate
sudo certbot certificates

# Check firewall
sudo ufw status
```

#### **Audio Not Reaching Icecast**
```bash
# Check FFmpeg installation
ffmpeg -version

# Check Icecast configuration
sudo nano /etc/icecast2/icecast.xml

# Test manual FFmpeg stream
ffmpeg -f pulse -i default -acodec libmp3lame -ab 128k -f mp3 icecast://source:PASSWORD@localhost:8000/stream
```

#### **JWT Token Issues**
```bash
# Verify JWT_SECRET matches between Next.js and Gateway
echo $JWT_SECRET

# Check token generation in Next.js logs
# Check token validation in Gateway logs
```

---

## 🔄 **Updates & Maintenance**

### **Updating Gateway**

```bash
cd /opt/almanhaj-gateway

# Stop service
sudo systemctl stop almanhaj-gateway

# Update code
git pull  # or copy new files

# Install dependencies
npm install

# Start service
sudo systemctl start almanhaj-gateway

# Check status
sudo systemctl status almanhaj-gateway
```

### **Backup Configuration**

```bash
# Backup important files
sudo cp /opt/almanhaj-gateway/.env ~/gateway-backup.env
sudo cp /etc/nginx/sites-available/gateway ~/gateway-nginx.conf
sudo cp /etc/systemd/system/almanhaj-gateway.service ~/gateway.service
```

---

## 📈 **Performance Optimization**

### **Node.js Optimization**

```bash
# Increase Node.js memory limit if needed
# Edit systemd service file:
sudo nano /etc/systemd/system/almanhaj-gateway.service

# Add to [Service] section:
Environment=NODE_OPTIONS="--max-old-space-size=1024"
```

### **Nginx Optimization**

```bash
# Edit Nginx configuration for better WebSocket performance
sudo nano /etc/nginx/nginx.conf

# Add to http block:
worker_connections 1024;
keepalive_timeout 65;
client_max_body_size 10M;
```

---

## 🎯 **Success Criteria**

✅ Gateway service running and stable  
✅ WebSocket connections working over SSL  
✅ Browser can connect and authenticate  
✅ Audio streams to Icecast successfully  
✅ Listeners can hear browser streams  
✅ Automatic reconnection works  
✅ Multiple presenters can queue (one at a time)  

---

## 📞 **Support**

If you encounter issues:

1. Check the troubleshooting section above
2. Review service logs: `sudo journalctl -u almanhaj-gateway -f`
3. Test each component individually
4. Verify all environment variables are correct
5. Ensure JWT_SECRET matches between Next.js and Gateway

The gateway is designed to be robust and self-healing, but proper configuration is essential for reliable operation.