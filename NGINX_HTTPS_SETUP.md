# Nginx + HTTPS Setup Guide

## Overview

This guide shows you how to set up Nginx as a reverse proxy with HTTPS for your Icecast streaming server. This provides:

- **HTTPS encryption** for secure streaming
- **Professional URL** (https://radio.example.com/stream)
- **Better compatibility** with modern browsers
- **Protection** for Icecast server (not directly exposed)

## Why Nginx + HTTPS?

**Without Nginx:**
- Icecast exposed directly on port 8000
- No HTTPS encryption
- Browsers may block HTTP streams
- Less professional appearance

**With Nginx + HTTPS:**
- Clean URL: `https://radio.example.com/stream`
- Encrypted connection
- Better browser compatibility
- Icecast protected behind reverse proxy
- Can add rate limiting, caching, etc.

## Architecture

```
┌──────────────┐
│   Internet   │
└──────┬───────┘
       │ HTTPS (443)
       ↓
┌──────────────┐
│    Nginx     │ ← Reverse proxy with SSL
│  (Port 443)  │
└──────┬───────┘
       │ HTTP (localhost)
       ↓
┌──────────────┐
│   Icecast    │ ← Streaming server
│  (Port 8000) │
└──────────────┘
```

## Prerequisites

- Ubuntu 22.04 LTS
- Icecast installed and running (see `ICECAST_SETUP.md`)
- Domain name pointing to your server (e.g., `radio.example.com`)
- Root or sudo access

## Step 1: Install Nginx

### Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Install Nginx

```bash
sudo apt install nginx -y
```

### Verify Installation

```bash
nginx -v
```

Expected output: `nginx version: nginx/1.18.0 (Ubuntu)`

### Start and Enable Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### Test Nginx

Visit `http://your-server-ip` in a browser. You should see the Nginx welcome page.

## Step 2: Configure DNS

Ensure your domain points to your server:

```bash
# Check DNS resolution
dig radio.example.com

# Or
nslookup radio.example.com
```

The A record should point to your server's IP address.

## Step 3: Create Nginx Configuration

### Create Site Configuration

```bash
sudo nano /etc/nginx/sites-available/radio
```

### Basic HTTP Configuration (Temporary)

```nginx
# Islamic Online Radio - Nginx Configuration
# This is the initial HTTP-only config (will be upgraded to HTTPS)

server {
    listen 80;
    listen [::]:80;
    server_name radio.example.com;

    # Logging
    access_log /var/log/nginx/radio-access.log;
    error_log /var/log/nginx/radio-error.log;

    # Root location (Icecast web interface)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Stream endpoint
    location /stream {
        proxy_pass http://127.0.0.1:8000/stream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Important for streaming
        proxy_buffering off;
        proxy_cache off;
        
        # Keep connection alive
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts for long-lived connections
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        
        # CORS headers (if needed for web players)
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range';
    }

    # Admin interface (optional - restrict access)
    location /admin {
        proxy_pass http://127.0.0.1:8000/admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Restrict to specific IPs (optional)
        # allow 1.2.3.4;  # Your IP
        # deny all;
    }
}
```

### Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/radio /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Test HTTP Access

Visit `http://radio.example.com/stream` in your browser or:

```bash
curl -I http://radio.example.com/stream
```

You should get a response from Icecast.

## Step 4: Install Certbot (Let's Encrypt)

### Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Verify Installation

```bash
certbot --version
```

## Step 5: Obtain SSL Certificate

### Run Certbot

```bash
sudo certbot --nginx -d radio.example.com
```

### Follow Prompts

1. **Email address:** Enter your email for renewal notifications
2. **Terms of Service:** Agree (A)
3. **Share email:** Your choice (Y/N)
4. **Redirect HTTP to HTTPS:** Choose 2 (Redirect)

Certbot will:
- Obtain SSL certificate from Let's Encrypt
- Automatically update Nginx configuration
- Set up HTTP to HTTPS redirect

### Verify Certificate

```bash
sudo certbot certificates
```

Expected output:
```
Certificate Name: radio.example.com
  Domains: radio.example.com
  Expiry Date: 2026-03-08 (VALID: 89 days)
```

## Step 6: Verify HTTPS Configuration

### Check Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/radio
```

Certbot should have added SSL configuration:

```nginx
server {
    server_name radio.example.com;

    # ... existing configuration ...

    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/radio.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/radio.example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = radio.example.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name radio.example.com;
    return 404;
}
```

### Test HTTPS Access

Visit `https://radio.example.com/stream` in your browser.

You should see a secure connection (padlock icon).

### Test with curl

```bash
# Test HTTPS
curl -I https://radio.example.com/stream

# Test HTTP redirect
curl -I http://radio.example.com/stream
```

HTTP should redirect to HTTPS.

## Step 7: Optimize Nginx Configuration

### Enhanced Configuration

```bash
sudo nano /etc/nginx/sites-available/radio
```

Add these optimizations:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name radio.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/radio.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/radio.example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/radio-access.log;
    error_log /var/log/nginx/radio-error.log;

    # Root location
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Stream endpoint (optimized for streaming)
    location /stream {
        proxy_pass http://127.0.0.1:8000/stream;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Streaming optimizations
        proxy_buffering off;
        proxy_cache off;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;
        
        # CORS (for web players)
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, HEAD, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Range, Accept-Encoding' always;
        
        # Handle OPTIONS requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Admin interface (restricted)
    location /admin {
        proxy_pass http://127.0.0.1:8000/admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # IP whitelist (uncomment and add your IPs)
        # allow 1.2.3.4;
        # deny all;
        
        # Basic auth (optional)
        # auth_basic "Admin Area";
        # auth_basic_user_file /etc/nginx/.htpasswd;
    }

    # Status page (for monitoring)
    location /status.xsl {
        proxy_pass http://127.0.0.1:8000/status.xsl;
        proxy_set_header Host $host;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name radio.example.com;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect everything else to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

### Test and Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: Configure Firewall

### Allow HTTP and HTTPS

```bash
# Allow HTTP (for Let's Encrypt renewal)
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### Block Direct Icecast Access

Ensure port 8000 is NOT open externally:

```bash
# Check firewall rules
sudo ufw status numbered

# If port 8000 is open, remove it
# sudo ufw delete [rule-number]
```

Icecast should only be accessible via Nginx reverse proxy.

## Step 9: Update Next.js Environment

Update `.env.local` on your Next.js server:

```env
# Use HTTPS URL
STREAM_URL=https://radio.example.com/stream
STREAM_HOST=radio.example.com
STREAM_PORT=443
STREAM_MOUNT=/stream
STREAM_FORMAT=MP3 128kbps
```

Restart your Next.js application:

```bash
# If using PM2
pm2 restart online-radio

# If using systemd
sudo systemctl restart online-radio

# If in development
npm run dev
```

## Step 10: Test Complete Setup

### Test Stream URL

```bash
# Test HTTPS stream
curl -I https://radio.example.com/stream

# Test with audio player
mpg123 https://radio.example.com/stream
```

### Test from Next.js App

1. Visit your Next.js app: `https://your-app.com/radio`
2. Click play button
3. Audio should stream from `https://radio.example.com/stream`

### Test SSL Certificate

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=radio.example.com

Should get an A or A+ rating.

## Certificate Renewal

### Automatic Renewal

Certbot automatically renews certificates. Check renewal timer:

```bash
sudo systemctl status certbot.timer
```

### Test Renewal

```bash
sudo certbot renew --dry-run
```

### Manual Renewal

```bash
sudo certbot renew
sudo systemctl reload nginx
```

Certificates are valid for 90 days and auto-renew at 60 days.

## Monitoring

### Check Nginx Status

```bash
sudo systemctl status nginx
```

### View Access Logs

```bash
# Real-time access log
sudo tail -f /var/log/nginx/radio-access.log

# Error log
sudo tail -f /var/log/nginx/radio-error.log
```

### Monitor Connections

```bash
# Active connections
sudo netstat -an | grep :443 | wc -l

# Or using ss
sudo ss -tan | grep :443 | wc -l
```

## Troubleshooting

### SSL Certificate Issues

**Problem:** Certificate not working

**Solutions:**
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Check Nginx config
sudo nginx -t
```

### Stream Not Working

**Problem:** Can't access stream

**Check:**
1. Nginx is running: `sudo systemctl status nginx`
2. Icecast is running: `sudo systemctl status icecast2`
3. Firewall allows 443: `sudo ufw status`
4. DNS is correct: `dig radio.example.com`

**Test:**
```bash
# Test Icecast directly
curl -I http://127.0.0.1:8000/stream

# Test Nginx proxy
curl -I https://radio.example.com/stream
```

### CORS Errors

**Problem:** Web player can't access stream

**Solution:** Add CORS headers in Nginx config:

```nginx
add_header Access-Control-Allow-Origin * always;
add_header Access-Control-Allow-Methods 'GET, HEAD, OPTIONS' always;
```

### High CPU Usage

**Solutions:**
- Enable gzip compression
- Adjust worker processes
- Add caching for static content

```nginx
# In /etc/nginx/nginx.conf
worker_processes auto;
gzip on;
gzip_types text/plain text/css application/json;
```

## Performance Optimization

### Enable HTTP/2

Already enabled in the config:

```nginx
listen 443 ssl http2;
```

### Adjust Worker Processes

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
worker_processes auto;
worker_connections 1024;
```

### Enable Caching (for static content)

```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Security Hardening

### Restrict Admin Access

```nginx
location /admin {
    # IP whitelist
    allow 1.2.3.4;  # Your IP
    deny all;
    
    proxy_pass http://127.0.0.1:8000/admin;
}
```

### Add Basic Authentication

```bash
# Install htpasswd
sudo apt install apache2-utils

# Create password file
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Add to Nginx config
location /admin {
    auth_basic "Admin Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://127.0.0.1:8000/admin;
}
```

### Rate Limiting

```nginx
# In http block
limit_req_zone $binary_remote_addr zone=stream:10m rate=10r/s;

# In location block
location /stream {
    limit_req zone=stream burst=20;
    proxy_pass http://127.0.0.1:8000/stream;
}
```

## Backup Configuration

```bash
# Backup Nginx config
sudo cp /etc/nginx/sites-available/radio /etc/nginx/sites-available/radio.backup

# Backup with date
sudo cp /etc/nginx/sites-available/radio /etc/nginx/sites-available/radio.$(date +%Y%m%d)
```

## Next Steps

1. ✅ Nginx installed and configured
2. ✅ HTTPS certificate obtained
3. ✅ Reverse proxy working
4. ✅ Stream accessible via HTTPS
5. ✅ Next.js app updated with HTTPS URL
6. → **Done!** Your streaming setup is complete

## Reference

### Port Usage

| Service | Port | Access |
|---------|------|--------|
| Nginx | 80 | HTTP (redirects to HTTPS) |
| Nginx | 443 | HTTPS (public) |
| Icecast | 8000 | Localhost only |

### Useful Commands

```bash
# Nginx
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
sudo nginx -t

# Certbot
sudo certbot certificates
sudo certbot renew
sudo certbot renew --dry-run

# Logs
sudo tail -f /var/log/nginx/radio-access.log
sudo tail -f /var/log/nginx/radio-error.log
```

## Support

- Nginx Documentation: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/docs/
- Certbot: https://certbot.eff.org/

---

**Last Updated:** December 8, 2025  
**Nginx Version:** 1.18.0  
**Ubuntu Version:** 22.04 LTS
