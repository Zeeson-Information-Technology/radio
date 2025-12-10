# 🚀 EC2 Deployment Steps for Broadcast Gateway

Complete step-by-step guide to deploy the Al-Manhaj Radio Broadcast Gateway on your existing EC2 instance.

## 📋 **Prerequisites Checklist**

Before starting, ensure you have:

- [ ] EC2 instance running Ubuntu 20.04+ 
- [ ] Icecast2 already installed and working
- [ ] SSH access to the EC2 instance
- [ ] Domain/subdomain for gateway (e.g., `stream.almanhaj.duckdns.org`)
- [ ] Basic knowledge of Linux commands

---

## 🔧 **Phase 1: System Preparation**

### **Step 1: Connect to EC2 Instance**

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system packages
sudo apt update && sudo apt upgrade -y
```

### **Step 2: Install Required Software**

```bash
# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg for audio processing
sudo apt install -y ffmpeg

# Install additional tools
sudo apt install -y git curl wget unzip

# Verify installations
node --version    # Should show v18.x.x
npm --version     # Should show 9.x.x or higher
ffmpeg -version   # Should show FFmpeg version info
```

### **Step 3: Create Application Directory**

```bash
# Create directory for the gateway
sudo mkdir -p /opt/almanhaj-gateway
sudo chown ubuntu:ubuntu /opt/almanhaj-gateway
cd /opt/almanhaj-gateway

# Create necessary subdirectories
mkdir -p logs backups
```

---

## 📦 **Phase 2: Deploy Gateway Application**

### **Step 4: Upload Gateway Files**

**Option A: Using SCP (from your local machine)**
```bash
# From your local machine, upload the gateway files
scp -i your-key.pem -r gateway/* ubuntu@your-ec2-ip:/opt/almanhaj-gateway/
```

**Option B: Using Git (if you have a repository)**
```bash
# Clone your repository
git clone https://github.com/your-org/almanhaj-radio.git temp-repo
cp -r temp-repo/gateway/* /opt/almanhaj-gateway/
rm -rf temp-repo
```

**Option C: Manual File Creation**
```bash
# Create files manually (copy content from the generated files)
nano /opt/almanhaj-gateway/server.js
nano /opt/almanhaj-gateway/package.json
nano /opt/almanhaj-gateway/.env.example
```

### **Step 5: Install Node.js Dependencies**

```bash
cd /opt/almanhaj-gateway

# Install production dependencies
npm install --production

# Verify installation
ls node_modules/  # Should show ws, jsonwebtoken folders
```

### **Step 6: Configure Environment Variables**

```bash
# Copy example environment file
cp .env.example .env

# Edit environment configuration
nano .env
```

**Configure these values in `.env`:**
```bash
# Gateway Configuration
GATEWAY_PORT=8080
NODE_ENV=production

# JWT Secret - MUST match your Next.js app
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Icecast Configuration (adjust if different)
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_PASSWORD=your-icecast-source-password
ICECAST_MOUNT=/stream

# Logging
LOG_LEVEL=info

# Security
ALLOWED_ORIGINS=https://your-radio-app.vercel.app,http://localhost:3000
```

**Important:** Replace these values:
- `JWT_SECRET`: Use the same secret as your Next.js app
- `ICECAST_PASSWORD`: Your actual Icecast source password
- `ALLOWED_ORIGINS`: Your actual Vercel app URL

---

## 🧪 **Phase 3: Testing**

### **Step 7: Test Gateway Manually**

```bash
cd /opt/almanhaj-gateway

# Test run the gateway
npm start

# You should see output like:
# 🎙️ Broadcast Gateway listening on port 8080
# 📡 Icecast target: localhost:8000/stream
```

**If successful, press `Ctrl+C` to stop and continue.**

**If you see errors:**
```bash
# Check if port 8080 is available
sudo netstat -tlnp | grep 8080

# Check Icecast is running
sudo systemctl status icecast2

# Check environment file
cat .env
```

### **Step 8: Test Icecast Connection**

```bash
# Test if Icecast is accessible
curl -I http://localhost:8000/admin/

# Test FFmpeg can connect to Icecast
timeout 5 ffmpeg -f lavfi -i "sine=frequency=1000:duration=5" -acodec libmp3lame -ab 128k -f mp3 icecast://source:YOUR_PASSWORD@localhost:8000/stream

# Check Icecast admin panel for the test stream
```

---

## ⚙️ **Phase 4: System Service Setup**

### **Step 9: Create Systemd Service**

```bash
# Copy service file to systemd directory
sudo cp /opt/almanhaj-gateway/almanhaj-gateway.service /etc/systemd/system/

# If the file doesn't exist, create it:
sudo nano /etc/systemd/system/almanhaj-gateway.service
```

**Service file content:**
```ini
[Unit]
Description=Al-Manhaj Radio Broadcast Gateway
Documentation=https://github.com/your-org/almanhaj-radio
After=network.target icecast2.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/almanhaj-gateway
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/almanhaj-gateway/.env

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/almanhaj-gateway

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=almanhaj-gateway

[Install]
WantedBy=multi-user.target
```

### **Step 10: Enable and Start Service**

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable almanhaj-gateway

# Start the service
sudo systemctl start almanhaj-gateway

# Check service status
sudo systemctl status almanhaj-gateway

# View logs
sudo journalctl -u almanhaj-gateway -f
```

**Expected output:**
```
● almanhaj-gateway.service - Al-Manhaj Radio Broadcast Gateway
   Loaded: loaded (/etc/systemd/system/almanhaj-gateway.service; enabled)
   Active: active (running) since [timestamp]
   Main PID: [pid] (node)
```

---

## 🌐 **Phase 5: Web Server Configuration**

### **Step 11: Configure Nginx for WebSocket**

```bash
# Create Nginx site configuration
sudo nano /etc/nginx/sites-available/gateway
```

**Nginx configuration:**
```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name stream.almanhaj.duckdns.org;
    return 301 https://$server_name$request_uri;
}

# HTTPS WebSocket proxy
server {
    listen 443 ssl http2;
    server_name stream.almanhaj.duckdns.org;
    
    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/stream.almanhaj.duckdns.org/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/stream.almanhaj.duckdns.org/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
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
        
        # CORS headers for WebSocket
        add_header Access-Control-Allow-Origin "https://your-radio-app.vercel.app";
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

### **Step 12: Enable Nginx Site**

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### **Step 13: Setup SSL Certificate**

```bash
# Install Certbot if not already installed
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate for your domain
sudo certbot --nginx -d stream.almanhaj.duckdns.org

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## 🔒 **Phase 6: Security Configuration**

### **Step 14: Configure Firewall**

```bash
# Check current firewall status
sudo ufw status

# Allow necessary ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8000/tcp    # Icecast (if needed externally)

# Enable firewall if not already enabled
sudo ufw --force enable

# Verify configuration
sudo ufw status numbered
```

### **Step 15: Secure File Permissions**

```bash
# Set proper ownership and permissions
sudo chown -R ubuntu:ubuntu /opt/almanhaj-gateway
chmod 755 /opt/almanhaj-gateway
chmod 644 /opt/almanhaj-gateway/*.js
chmod 644 /opt/almanhaj-gateway/package.json
chmod 600 /opt/almanhaj-gateway/.env  # Secure environment file

# Verify permissions
ls -la /opt/almanhaj-gateway/
```

---

## ✅ **Phase 7: Final Testing**

### **Step 16: End-to-End Testing**

```bash
# Test 1: Check all services are running
sudo systemctl status icecast2
sudo systemctl status almanhaj-gateway
sudo systemctl status nginx

# Test 2: Check ports are listening
sudo netstat -tlnp | grep -E "(80|443|8000|8080)"

# Test 3: Test WebSocket connection
# Install wscat for testing
npm install -g wscat

# Test WebSocket connection (should fail without token, but connection should work)
wscat -c wss://stream.almanhaj.duckdns.org
```

### **Step 17: Test from Next.js App**

1. **Update Next.js Environment Variables:**
   ```bash
   # In your Vercel dashboard, add:
   NEXT_PUBLIC_GATEWAY_URL=wss://stream.almanhaj.duckdns.org
   JWT_SECRET=your-super-secure-jwt-secret-key-here
   ```

2. **Deploy Next.js Changes:**
   ```bash
   # Deploy your updated Next.js app with BrowserEncoder component
   git push  # This will trigger Vercel deployment
   ```

3. **Test Browser Streaming:**
   - Go to your radio app admin panel
   - Navigate to `/admin/live`
   - Try the browser broadcasting feature
   - Check Icecast admin panel for active source

---

## 📊 **Phase 8: Monitoring Setup**

### **Step 18: Setup Log Monitoring**

```bash
# Create log rotation for gateway
sudo nano /etc/logrotate.d/almanhaj-gateway
```

**Log rotation configuration:**
```
/var/log/almanhaj-gateway/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        systemctl reload almanhaj-gateway
    endscript
}
```

### **Step 19: Setup Monitoring Script**

```bash
# Create monitoring script
nano /opt/almanhaj-gateway/monitor.sh
```

**Monitoring script:**
```bash
#!/bin/bash

# Al-Manhaj Radio Gateway Monitor
LOG_FILE="/var/log/almanhaj-gateway/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if gateway service is running
if ! systemctl is-active --quiet almanhaj-gateway; then
    echo "[$DATE] ERROR: Gateway service is not running" >> $LOG_FILE
    systemctl restart almanhaj-gateway
    echo "[$DATE] INFO: Gateway service restarted" >> $LOG_FILE
fi

# Check if port 8080 is listening
if ! netstat -tlnp | grep -q ":8080 "; then
    echo "[$DATE] ERROR: Gateway port 8080 not listening" >> $LOG_FILE
fi

# Check Icecast connection
if ! curl -s -f http://localhost:8000/admin/ > /dev/null; then
    echo "[$DATE] WARNING: Icecast admin not accessible" >> $LOG_FILE
fi

echo "[$DATE] INFO: Monitor check completed" >> $LOG_FILE
```

```bash
# Make script executable
chmod +x /opt/almanhaj-gateway/monitor.sh

# Add to crontab (run every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * /opt/almanhaj-gateway/monitor.sh
```

---

## 🎯 **Deployment Verification Checklist**

### **System Services**
- [ ] Node.js 18+ installed and working
- [ ] FFmpeg installed and accessible
- [ ] Icecast2 running and accessible
- [ ] Gateway service running and enabled
- [ ] Nginx running with WebSocket proxy
- [ ] SSL certificate installed and valid

### **Network Configuration**
- [ ] Port 8080 listening (gateway)
- [ ] Port 443 accessible (HTTPS)
- [ ] Domain resolves to EC2 IP
- [ ] WebSocket upgrade working
- [ ] CORS headers configured

### **Security**
- [ ] Firewall configured properly
- [ ] File permissions set correctly
- [ ] Environment variables secured
- [ ] SSL certificate auto-renewal working

### **Application Testing**
- [ ] Gateway connects to Icecast
- [ ] JWT authentication working
- [ ] Browser can connect via WebSocket
- [ ] Audio streams successfully
- [ ] Listeners can hear browser streams

---

## 🔧 **Post-Deployment Maintenance**

### **Regular Tasks**

**Daily:**
- Check service status: `sudo systemctl status almanhaj-gateway`
- Review logs: `sudo journalctl -u almanhaj-gateway --since "24 hours ago"`

**Weekly:**
- Update system packages: `sudo apt update && sudo apt upgrade`
- Check SSL certificate: `sudo certbot certificates`
- Review monitoring logs: `cat /var/log/almanhaj-gateway/monitor.log`

**Monthly:**
- Backup configuration files
- Review and rotate logs
- Test disaster recovery procedures

### **Backup Strategy**

```bash
# Create backup script
nano /opt/almanhaj-gateway/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup gateway files
tar -czf $BACKUP_DIR/gateway_$DATE.tar.gz /opt/almanhaj-gateway/

# Backup Nginx configuration
cp /etc/nginx/sites-available/gateway $BACKUP_DIR/nginx_gateway_$DATE.conf

# Backup systemd service
cp /etc/systemd/system/almanhaj-gateway.service $BACKUP_DIR/systemd_$DATE.service

echo "Backup completed: $DATE"
```

---

## 🆘 **Emergency Procedures**

### **If Gateway Service Fails**
```bash
# Check service status
sudo systemctl status almanhaj-gateway

# Restart service
sudo systemctl restart almanhaj-gateway

# Check logs for errors
sudo journalctl -u almanhaj-gateway -n 50

# If persistent issues, check:
# 1. Environment variables
# 2. Port availability
# 3. Icecast connectivity
# 4. File permissions
```

### **If SSL Certificate Expires**
```bash
# Renew certificate manually
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx
```

### **If Icecast Connection Fails**
```bash
# Check Icecast status
sudo systemctl status icecast2

# Check Icecast configuration
sudo nano /etc/icecast2/icecast.xml

# Restart Icecast if needed
sudo systemctl restart icecast2
```

---

## 🎉 **Deployment Complete!**

Your Al-Manhaj Radio Broadcast Gateway is now deployed and ready for use!

**Next Steps:**
1. Train presenters on the new browser broadcasting feature
2. Update documentation with your specific domain names
3. Monitor usage and performance
4. Gather feedback from presenters
5. Plan for scaling if needed

**Success Indicators:**
- ✅ Presenters can broadcast from browser
- ✅ Audio quality is clear and stable
- ✅ System handles multiple presenter sessions
- ✅ Automatic reconnection works
- ✅ No significant downtime

May Allah bless this effort to spread beneficial Islamic knowledge! 

جزاكم الله خيرا