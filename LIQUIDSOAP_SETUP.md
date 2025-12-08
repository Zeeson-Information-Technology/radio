# Liquidsoap Setup Guide

## Overview

Liquidsoap is an audio streaming language that allows you to create complex streaming setups. For the Islamic Online Radio platform, we'll use it to:

1. Accept live input from presenters (OBS/BUTT)
2. Automatically fallback to a playlist when no live source is connected
3. Stream to Icecast on the `/stream` mount point

## Why Liquidsoap?

Without Liquidsoap:
- When no presenter is live, listeners hear silence or get disconnected
- Manual intervention needed to switch between live and recorded content

With Liquidsoap:
- Seamless transition between live and recorded content
- Automatic fallback to playlist when presenter disconnects
- Always something playing for listeners
- Professional radio experience

## Architecture

```
┌──────────────────┐
│  OBS / BUTT      │ ← Presenter (when live)
│  (Live Source)   │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   Liquidsoap     │ ← Audio processor
│                  │
│  ┌────────────┐  │
│  │ Live Input │  │ ← Priority 1
│  └────────────┘  │
│         ↓        │
│  ┌────────────┐  │
│  │  Fallback  │  │ ← Priority 2
│  │  Playlist  │  │
│  └────────────┘  │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│     Icecast      │ ← Streaming server
│   /stream mount  │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│    Listeners     │
└──────────────────┘
```

## Prerequisites

- Ubuntu 22.04 LTS
- Icecast already installed and configured (see `ICECAST_SETUP.md`)
- Root or sudo access
- Audio files (MP3) for fallback playlist

## Step 1: Install Liquidsoap

### Add Liquidsoap Repository

```bash
# Add repository
sudo add-apt-repository ppa:liquidsoap/liquidsoap
sudo apt update
```

### Install Liquidsoap

```bash
sudo apt install liquidsoap -y
```

### Verify Installation

```bash
liquidsoap --version
```

Expected output: `Liquidsoap 2.x.x`

## Step 2: Prepare Audio Files

### Create Playlist Directory

```bash
sudo mkdir -p /var/radio/playlist
sudo mkdir -p /var/radio/logs
```

### Upload Audio Files

Upload your MP3 lecture files to `/var/radio/playlist/`:

```bash
# Example: Copy files from local machine
scp *.mp3 user@radio.example.com:/tmp/
sudo mv /tmp/*.mp3 /var/radio/playlist/

# Or download from URL
cd /var/radio/playlist
sudo wget https://example.com/lecture1.mp3
sudo wget https://example.com/lecture2.mp3
```

### Set Permissions

```bash
sudo chown -R liquidsoap:liquidsoap /var/radio
sudo chmod -R 755 /var/radio
```

### Verify Files

```bash
ls -lh /var/radio/playlist/
```

## Step 3: Create Liquidsoap Script

### Create Script File

```bash
sudo nano /opt/radio/radio.liq
```

### Basic Liquidsoap Script

```liquidsoap
#!/usr/bin/liquidsoap

# Islamic Online Radio - Liquidsoap Configuration
# This script handles live input with fallback to playlist

# Set log file
set("log.file.path", "/var/radio/logs/liquidsoap.log")
set("log.level", 3)

# Audio settings
set("frame.audio.samplerate", 44100)
set("frame.audio.channels", 2)

# Icecast connection settings
icecast_host = "127.0.0.1"
icecast_port = 8000
icecast_password = "RADIO_SOURCE_PASSWORD"  # Replace with your password
icecast_mount = "stream"
icecast_name = "Al-Manhaj Radio"
icecast_description = "Islamic lectures and Quran recitation"
icecast_genre = "Religious"
icecast_url = "https://radio.example.com"

# Live input from OBS/BUTT
# Accepts connection on port 8001
live = input.harbor(
    "live",
    port=8001,
    password="LIVE_INPUT_PASSWORD",  # Replace with a strong password
    buffer=5.0,
    max=10.0
)

# Fallback playlist
# Plays MP3 files from /var/radio/playlist in random order
playlist = playlist(
    "/var/radio/playlist",
    mode="randomize",
    reload_mode="watch"
)

# Add a small jingle between tracks (optional)
# playlist = crossfade(playlist)

# Fallback logic: Use live when available, otherwise use playlist
radio = fallback(
    track_sensitive=false,
    [live, playlist]
)

# Normalize audio levels
radio = normalize(radio, gain_max=3.0, gain_min=-3.0)

# Add metadata
radio = map_metadata(
    fun (m) -> 
        if m["source"] == "live" then
            [("title", "Live Lecture"), ("artist", "Al-Manhaj Radio")]
        else
            m
        end,
    radio
)

# Output to Icecast
output.icecast(
    %mp3(bitrate=128),
    host=icecast_host,
    port=icecast_port,
    password=icecast_password,
    mount=icecast_mount,
    name=icecast_name,
    description=icecast_description,
    genre=icecast_genre,
    url=icecast_url,
    radio
)

# Log when switching between sources
def on_track(m) =
    log("Now playing: #{m['title']} - #{m['artist']}")
end

radio = on_track(radio)

# Keep script running
log("Al-Manhaj Radio Liquidsoap started successfully")
```

### Important Configuration

**Replace these placeholders:**
- `RADIO_SOURCE_PASSWORD` → Your Icecast source password (from `icecast.xml`)
- `LIVE_INPUT_PASSWORD` → A strong password for OBS/BUTT to connect to Liquidsoap
- `radio.example.com` → Your actual domain

### Create Directory for Script

```bash
sudo mkdir -p /opt/radio
sudo mv /opt/radio/radio.liq /opt/radio/radio.liq
sudo chmod +x /opt/radio/radio.liq
```

## Step 4: Test Liquidsoap Script

### Test Syntax

```bash
liquidsoap --check /opt/radio/radio.liq
```

Expected output: `Script loaded successfully!`

### Run Manually (for testing)

```bash
sudo liquidsoap /opt/radio/radio.liq
```

You should see:
```
Al-Manhaj Radio Liquidsoap started successfully
```

Press `Ctrl+C` to stop.

## Step 5: Create Systemd Service

### Create Service File

```bash
sudo nano /etc/systemd/system/liquidsoap-radio.service
```

### Service Configuration

```ini
[Unit]
Description=Liquidsoap Radio Streaming
After=network.target icecast2.service
Requires=icecast2.service

[Service]
Type=simple
User=liquidsoap
Group=liquidsoap
ExecStart=/usr/bin/liquidsoap /opt/radio/radio.liq
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/radio

[Install]
WantedBy=multi-user.target
```

### Create Liquidsoap User

```bash
sudo useradd -r -s /bin/false liquidsoap
sudo chown -R liquidsoap:liquidsoap /var/radio
sudo chown -R liquidsoap:liquidsoap /opt/radio
```

### Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable liquidsoap-radio

# Start service
sudo systemctl start liquidsoap-radio

# Check status
sudo systemctl status liquidsoap-radio
```

Expected output:
```
● liquidsoap-radio.service - Liquidsoap Radio Streaming
     Loaded: loaded (/etc/systemd/system/liquidsoap-radio.service; enabled)
     Active: active (running) since ...
```

## Step 6: Configure OBS/BUTT for Liquidsoap

### Option 1: Direct to Liquidsoap (Recommended)

**OBS Studio Settings:**
- Service: Custom
- Server: `http://radio.example.com:8001/live`
- Stream Key: `LIVE_INPUT_PASSWORD`

**BUTT Settings:**
- Address: `radio.example.com`
- Port: `8001`
- Password: `LIVE_INPUT_PASSWORD`
- Mount: `live`
- Icecast: Yes

### Option 2: Direct to Icecast (Alternative)

If you prefer to stream directly to Icecast (without Liquidsoap fallback):

**OBS Studio Settings:**
- Service: Custom
- Server: `http://radio.example.com:8000/stream`
- Stream Key: `RADIO_SOURCE_PASSWORD`

## Step 7: Verify Setup

### Check Liquidsoap is Running

```bash
sudo systemctl status liquidsoap-radio
```

### Check Logs

```bash
# Liquidsoap logs
sudo tail -f /var/radio/logs/liquidsoap.log

# System logs
sudo journalctl -u liquidsoap-radio -f
```

### Check Icecast Status

Visit: `http://localhost:8000/status.xsl`

You should see `/stream` mount point with:
- **Source:** Liquidsoap
- **Listeners:** 0 (or more if people are listening)
- **Status:** Connected

### Test Playback

```bash
# From the server
mpg123 http://127.0.0.1:8000/stream

# Or from your computer (if Nginx is set up)
mpg123 https://radio.example.com/stream
```

You should hear audio from the playlist.

## Step 8: Test Live Streaming

### Start Streaming from OBS/BUTT

1. Configure OBS/BUTT with Liquidsoap settings (port 8001)
2. Click "Start Streaming"
3. Check Liquidsoap logs:

```bash
sudo tail -f /var/radio/logs/liquidsoap.log
```

You should see:
```
Now playing: Live Lecture - Al-Manhaj Radio
```

### Verify Live is Active

Check Icecast status page. The `/stream` mount should show:
- **Source:** Live input (via Liquidsoap)

### Stop Streaming

Stop OBS/BUTT. Liquidsoap should automatically switch to playlist.

Check logs:
```
Now playing: [Lecture Title] - [Lecturer Name]
```

## Advanced Configuration

### Add Jingles Between Tracks

```liquidsoap
# Add jingles
jingles = playlist("/var/radio/jingles", mode="randomize")

# Play jingle every 3 tracks
radio = rotate(weights=[1,3], [jingles, playlist])
```

### Crossfade Between Tracks

```liquidsoap
# Smooth transitions
playlist = crossfade(duration=3.0, playlist)
```

### Add Silence Detection

```liquidsoap
# Detect silence and skip
playlist = skip_blank(playlist, threshold=-40.0, length=5.0)
```

### Add Compression

```liquidsoap
# Compress audio for consistent levels
radio = compress(radio, ratio=3.0, threshold=-15.0)
```

### Schedule Different Playlists

```liquidsoap
# Different playlists for different times
morning = playlist("/var/radio/morning")
evening = playlist("/var/radio/evening")

radio = switch([
    ({0h-12h}, morning),
    ({12h-24h}, evening)
])
```

## Troubleshooting

### Liquidsoap Won't Start

**Check logs:**
```bash
sudo journalctl -u liquidsoap-radio -n 50
```

**Common issues:**
- Syntax error in script
- Port 8001 already in use
- Permission issues with audio files
- Icecast not running

**Solutions:**
```bash
# Check syntax
liquidsoap --check /opt/radio/radio.liq

# Check port
sudo lsof -i :8001

# Fix permissions
sudo chown -R liquidsoap:liquidsoap /var/radio
```

### No Audio from Playlist

**Check:**
1. Audio files exist: `ls /var/radio/playlist/`
2. Files are readable: `sudo -u liquidsoap ls /var/radio/playlist/`
3. Files are valid MP3: `file /var/radio/playlist/*.mp3`

**Test audio file:**
```bash
mpg123 /var/radio/playlist/lecture1.mp3
```

### Live Input Not Working

**Check:**
1. Port 8001 is open in firewall
2. Correct password in OBS/BUTT
3. Liquidsoap is listening: `sudo netstat -tlnp | grep 8001`

**Test connection:**
```bash
telnet radio.example.com 8001
```

### Audio Quality Issues

**Solutions:**
- Increase bitrate in script: `%mp3(bitrate=192)`
- Use better source audio files
- Adjust normalize settings
- Add compression

## Monitoring

### Check Active Source

```bash
# View Liquidsoap logs
sudo tail -f /var/radio/logs/liquidsoap.log

# Check which source is active
curl http://127.0.0.1:8000/admin/stats.xml | grep -A 5 "stream"
```

### Monitor System Resources

```bash
# CPU and memory
htop

# Liquidsoap process
ps aux | grep liquidsoap
```

## Maintenance

### Restart Liquidsoap

```bash
sudo systemctl restart liquidsoap-radio
```

### Update Playlist

```bash
# Add new files
sudo cp new-lecture.mp3 /var/radio/playlist/

# Liquidsoap will automatically detect new files
# No restart needed!
```

### Backup Configuration

```bash
sudo cp /opt/radio/radio.liq /opt/radio/radio.liq.backup
```

### Update Liquidsoap

```bash
sudo apt update
sudo apt upgrade liquidsoap
sudo systemctl restart liquidsoap-radio
```

## Firewall Configuration

```bash
# Allow Liquidsoap input port (if streaming remotely)
sudo ufw allow 8001/tcp

# Check status
sudo ufw status
```

## Next Steps

1. ✅ Liquidsoap installed and configured
2. ✅ Fallback playlist working
3. ✅ Live input tested
4. ✅ Service running and enabled
5. → **Next:** Set up Nginx reverse proxy with HTTPS (see `NGINX_HTTPS_SETUP.md`)

## Reference

### Port Usage

| Service | Port | Purpose |
|---------|------|---------|
| Icecast | 8000 | Streaming server (localhost only) |
| Liquidsoap | 8001 | Live input from OBS/BUTT |
| Nginx | 80/443 | Public HTTPS access |

### Useful Commands

```bash
# Start/Stop/Restart
sudo systemctl start liquidsoap-radio
sudo systemctl stop liquidsoap-radio
sudo systemctl restart liquidsoap-radio

# Status
sudo systemctl status liquidsoap-radio

# Logs
sudo journalctl -u liquidsoap-radio -f
sudo tail -f /var/radio/logs/liquidsoap.log

# Test script
liquidsoap --check /opt/radio/radio.liq
```

## Support

- Liquidsoap Documentation: https://www.liquidsoap.info/doc.html
- Liquidsoap GitHub: https://github.com/savonet/liquidsoap
- Community Forum: https://github.com/savonet/liquidsoap/discussions

---

**Last Updated:** December 8, 2025  
**Liquidsoap Version:** 2.x  
**Ubuntu Version:** 22.04 LTS
