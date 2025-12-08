# Icecast Server Setup Guide

## Overview

This guide provides step-by-step instructions for setting up an Icecast streaming server on Ubuntu 22.04 LTS. Icecast will serve as the streaming server for the Islamic Online Radio platform.

## Prerequisites

- Ubuntu 22.04 LTS server
- Root or sudo access
- Domain name (e.g., `radio.example.com`) pointing to your server
- Basic knowledge of Linux command line

## Architecture

```
┌─────────────────┐
│  OBS / BUTT     │ ← Presenter streams from here
│  (Source)       │
└────────┬────────┘
         │ Source connection (port 8000)
         ↓
┌─────────────────┐
│    Icecast      │ ← Streaming server
│  (localhost:8000)│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     Nginx       │ ← Reverse proxy with HTTPS
│   (port 443)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Listeners     │ ← Public access via HTTPS
│ (radio.example  │
│     .com)       │
└─────────────────┘
```

## Step 1: Install Icecast

### Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Install Icecast2

```bash
sudo apt install icecast2 -y
```

During installation, you'll be prompted to configure Icecast:
- **Configure Icecast2?** → Yes
- **Hostname:** Enter your domain (e.g., `radio.example.com`)
- **Source Password:** Enter a strong password (save this!)
- **Relay Password:** Enter a strong password
- **Admin Password:** Enter a strong password (save this!)

**Important:** Save these passwords securely. You'll need them later.

## Step 2: Configure Icecast

### Edit Configuration File

```bash
sudo nano /etc/icecast2/icecast.xml
```

### Sample Configuration

Replace the relevant sections with your settings:

```xml
<icecast>
    <!-- Location and Admin -->
    <location>Nigeria</location>
    <admin>admin@radio.example.com</admin>

    <!-- Limits -->
    <limits>
        <clients>100</clients>
        <sources>2</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>

    <!-- Authentication -->
    <authentication>
        <!-- Source password: Used by OBS/BUTT to connect -->
        <source-password>RADIO_SOURCE_PASSWORD</source-password>
        
        <!-- Relay password: For relay servers -->
        <relay-password>RADIO_RELAY_PASSWORD</relay-password>
        
        <!-- Admin password: For web admin interface -->
        <admin-user>admin</admin-user>
        <admin-password>RADIO_ADMIN_PASSWORD</admin-password>
    </authentication>

    <!-- Hostname -->
    <hostname>radio.example.com</hostname>

    <!-- Listen Socket -->
    <listen-socket>
        <port>8000</port>
        <!-- Bind to localhost only (Nginx will proxy) -->
        <bind-address>127.0.0.1</bind-address>
    </listen-socket>

    <!-- Paths -->
    <paths>
        <basedir>/usr/share/icecast2</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <alias source="/" destination="/status.xsl"/>
    </paths>

    <!-- Logging -->
    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>

    <!-- Security -->
    <security>
        <chroot>0</chroot>
    </security>
</icecast>
```

### Important Configuration Notes

**Replace these placeholders:**
- `RADIO_SOURCE_PASSWORD` → Strong password for streaming sources (OBS/BUTT)
- `RADIO_RELAY_PASSWORD` → Strong password for relay servers
- `RADIO_ADMIN_PASSWORD` → Strong password for admin interface
- `radio.example.com` → Your actual domain name

**Security Best Practices:**
- Use strong, unique passwords (20+ characters)
- Use a password manager to store them
- Don't use the same password for all three
- Bind to `127.0.0.1` (localhost) to prevent direct external access

### Enable Icecast Service

Edit the Icecast defaults file:

```bash
sudo nano /etc/default/icecast2
```

Change `ENABLE=false` to:

```bash
ENABLE=true
```

## Step 3: Start Icecast

### Start and Enable Service

```bash
# Start Icecast
sudo systemctl start icecast2

# Enable on boot
sudo systemctl enable icecast2

# Check status
sudo systemctl status icecast2
```

Expected output:
```
● icecast2.service - Icecast streaming media server
     Loaded: loaded (/lib/systemd/system/icecast2.service; enabled)
     Active: active (running) since ...
```

### Verify Icecast is Running

```bash
# Check if Icecast is listening on port 8000
sudo netstat -tlnp | grep 8000

# Or using ss
sudo ss -tlnp | grep 8000
```

Expected output:
```
tcp   0   0 127.0.0.1:8000   0.0.0.0:*   LISTEN   1234/icecast
```

## Step 4: Test Icecast

### Access Admin Interface

Since Icecast is bound to localhost, you can test it locally:

```bash
# From the server
curl http://127.0.0.1:8000/admin/

# Or create an SSH tunnel from your local machine
ssh -L 8000:localhost:8000 user@radio.example.com
```

Then open in your browser: `http://localhost:8000/admin/`

**Login:**
- Username: `admin`
- Password: Your `RADIO_ADMIN_PASSWORD`

### Check Status Page

Visit: `http://localhost:8000/status.xsl`

You should see the Icecast status page with no active streams (yet).

## Step 5: Configure Mount Point

Icecast will automatically create mount points when sources connect. However, you can pre-configure them for better control.

Add this inside the `<icecast>` tag in `/etc/icecast2/icecast.xml`:

```xml
<mount>
    <mount-name>/stream</mount-name>
    <username>source</username>
    <password>RADIO_SOURCE_PASSWORD</password>
    <max-listeners>100</max-listeners>
    <dump-file>/var/log/icecast2/stream-dump.mp3</dump-file>
    <burst-size>65536</burst-size>
    <fallback-mount>/fallback.mp3</fallback-mount>
    <fallback-override>1</fallback-override>
    <fallback-when-full>1</fallback-when-full>
    <public>1</public>
    <stream-name>Islamic Radio</stream-name>
    <stream-description>Islamic lectures and Quran recitation</stream-description>
    <stream-url>https://radio.example.com</stream-url>
    <genre>Religious</genre>
    <bitrate>128</bitrate>
    <type>audio/mpeg</type>
</mount>
```

Restart Icecast after changes:

```bash
sudo systemctl restart icecast2
```

## Step 6: Firewall Configuration

If using UFW (Ubuntu Firewall):

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS (for Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Do NOT open port 8000 externally
# Icecast should only be accessible via Nginx reverse proxy

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 7: Update Next.js Environment Variables

On your Next.js application server, update `.env.local`:

```env
# Streaming Server Configuration
STREAM_URL=https://radio.example.com/stream
STREAM_HOST=radio.example.com
STREAM_PORT=8000
STREAM_MOUNT=/stream
STREAM_FORMAT=MP3 128kbps

# Note: Do NOT put STREAM_PASSWORD in .env.local
# Passwords should only be on the Icecast server
```

## Step 8: Test Streaming

### Using BUTT (Broadcast Using This Tool)

1. **Download BUTT:**
   - Linux: `sudo apt install butt`
   - Windows/Mac: Download from https://danielnoethen.de/butt/

2. **Configure BUTT:**
   - Settings → Main
   - Address: `radio.example.com` (or `127.0.0.1` if testing locally)
   - Port: `8000`
   - Password: Your `RADIO_SOURCE_PASSWORD`
   - Mount: `stream`
   - Icecast: Yes

3. **Start Streaming:**
   - Click "Play" in BUTT
   - Check Icecast status page: `http://localhost:8000/status.xsl`
   - You should see `/stream` listed as active

### Using OBS Studio

1. **Open OBS Studio**

2. **Settings → Stream:**
   - Service: Custom
   - Server: `http://radio.example.com:8000/stream`
   - Stream Key: Your `RADIO_SOURCE_PASSWORD`

3. **Settings → Output:**
   - Output Mode: Advanced
   - Audio Encoder: FFmpeg AAC or MP3 (LAME)
   - Audio Bitrate: 128 kbps

4. **Start Streaming:**
   - Click "Start Streaming"
   - Check Icecast status page

## Troubleshooting

### Icecast Won't Start

**Check logs:**
```bash
sudo tail -f /var/log/icecast2/error.log
```

**Common issues:**
- Port 8000 already in use
- Permission issues with log directory
- Invalid XML in config file

**Solutions:**
```bash
# Check what's using port 8000
sudo lsof -i :8000

# Fix log directory permissions
sudo chown -R icecast2:icecast /var/log/icecast2

# Validate XML syntax
xmllint /etc/icecast2/icecast.xml
```

### Can't Connect from OBS/BUTT

**Check:**
1. Icecast is running: `sudo systemctl status icecast2`
2. Firewall allows connection (if connecting remotely)
3. Correct password being used
4. Correct mount point (`/stream`)

**Test connection:**
```bash
# From the streaming computer
telnet radio.example.com 8000
```

### Stream Connects but No Audio

**Check:**
1. Audio source in OBS/BUTT is configured
2. Audio levels are not muted
3. Correct audio codec (MP3 or AAC)
4. Bitrate is reasonable (128 kbps recommended)

### High CPU Usage

**Solutions:**
- Reduce number of allowed clients in `icecast.xml`
- Use a more powerful server
- Enable burst-on-connect to reduce initial load

## Monitoring

### Check Active Streams

```bash
# View status
curl http://127.0.0.1:8000/status.xsl

# View active listeners
curl http://127.0.0.1:8000/admin/listclients?mount=/stream
```

### Monitor Logs

```bash
# Access log (listener connections)
sudo tail -f /var/log/icecast2/access.log

# Error log
sudo tail -f /var/log/icecast2/error.log
```

### System Resources

```bash
# CPU and memory usage
htop

# Disk space
df -h

# Network usage
iftop
```

## Maintenance

### Restart Icecast

```bash
sudo systemctl restart icecast2
```

### Update Icecast

```bash
sudo apt update
sudo apt upgrade icecast2
```

### Backup Configuration

```bash
# Backup config
sudo cp /etc/icecast2/icecast.xml /etc/icecast2/icecast.xml.backup

# Backup with date
sudo cp /etc/icecast2/icecast.xml /etc/icecast2/icecast.xml.$(date +%Y%m%d)
```

### Rotate Logs

Icecast automatically rotates logs based on the `<logsize>` setting. To manually rotate:

```bash
sudo systemctl reload icecast2
```

## Security Hardening

### 1. Use Strong Passwords

Generate strong passwords:

```bash
# Generate 32-character password
openssl rand -base64 32
```

### 2. Bind to Localhost Only

In `icecast.xml`:

```xml
<bind-address>127.0.0.1</bind-address>
```

This prevents direct external access. Use Nginx reverse proxy instead.

### 3. Limit Connections

In `icecast.xml`:

```xml
<limits>
    <clients>100</clients>
    <sources>2</sources>
</limits>
```

### 4. Regular Updates

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y
```

### 5. Monitor Access Logs

```bash
# Check for suspicious activity
sudo tail -100 /var/log/icecast2/access.log | grep -i "admin"
```

## Next Steps

1. ✅ Icecast installed and configured
2. ✅ Service running and enabled
3. ✅ Firewall configured
4. ✅ Environment variables updated
5. → **Next:** Set up Nginx reverse proxy with HTTPS (see `NGINX_HTTPS_SETUP.md`)
6. → **Optional:** Set up Liquidsoap for fallback playlist (see `LIQUIDSOAP_SETUP.md`)

## Reference

### Icecast Configuration Mapping

| Icecast Setting | Next.js Env Variable | Description |
|----------------|---------------------|-------------|
| `<hostname>` | `STREAM_HOST` | Domain name |
| `<port>` | `STREAM_PORT` | Port number (8000) |
| `<mount-name>` | `STREAM_MOUNT` | Mount point (/stream) |
| Full URL | `STREAM_URL` | https://radio.example.com/stream |

### Useful Commands

```bash
# Start/Stop/Restart
sudo systemctl start icecast2
sudo systemctl stop icecast2
sudo systemctl restart icecast2

# Status
sudo systemctl status icecast2

# Logs
sudo journalctl -u icecast2 -f

# Config test
sudo icecast2 -c /etc/icecast2/icecast.xml
```

## Support

- Icecast Documentation: https://icecast.org/docs/
- Icecast Forum: https://forum.icecast.org/
- Ubuntu Server Guide: https://ubuntu.com/server/docs

---

**Last Updated:** December 8, 2025  
**Icecast Version:** 2.4.x  
**Ubuntu Version:** 22.04 LTS
