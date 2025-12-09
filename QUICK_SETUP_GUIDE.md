# Quick Setup Guide - Get Your Radio Online NOW!

## Current Status ✅
- ✅ Server: `98.93.42.61`
- ✅ SSH Access: Working
- ✅ Rocket Broadcaster: Installed locally
- 🔴 Need: Install Icecast on server and configure

## Step-by-Step Setup (30 minutes)

### Step 1: Install Icecast on Your Server

SSH into your server:
```bash
ssh -i radio-key.pem ubuntu@98.93.42.61
```

Install Icecast:
```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Icecast
sudo apt install icecast2 -y
```

**During installation, you'll be asked:**
1. **Configure Icecast2?** → Select **Yes**
2. **Hostname:** Enter `98.93.42.61` (or your domain if you have one)
3. **Source Password:** Enter a strong password (e.g., `MyRadio2025!`) - **SAVE THIS!**
4. **Relay Password:** Enter another password
5. **Admin Password:** Enter another password - **SAVE THIS!**

### Step 2: Configure Icecast

Edit the config file:
```bash
sudo nano /etc/icecast2/icecast.xml
```

Find and update these sections:

**A. Change bind address to allow external connections:**
```xml
<listen-socket>
    <port>8000</port>
    <!-- Change this line: -->
    <bind-address>0.0.0.0</bind-address>
    <!-- Instead of: <bind-address>127.0.0.1</bind-address> -->
</listen-socket>
```

**B. Update passwords (use the ones you set during installation):**
```xml
<authentication>
    <source-password>MyRadio2025!</source-password>
    <relay-password>your_relay_password</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>your_admin_password</admin-password>
</authentication>
```

**C. Update hostname:**
```xml
<hostname>98.93.42.61</hostname>
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Enable and Start Icecast

```bash
# Enable Icecast to start on boot
sudo systemctl enable icecast2

# Start Icecast
sudo systemctl start icecast2

# Check status
sudo systemctl status icecast2
```

You should see: **"active (running)"** in green

### Step 4: Open Firewall Port

```bash
# Allow Icecast port
sudo ufw allow 8000/tcp

# Check firewall status
sudo ufw status
```

### Step 5: Test Icecast is Working

From your local computer, open browser and visit:
```
http://98.93.42.61:8000
```

You should see the **Icecast status page**! 🎉

### Step 6: Configure Rocket Broadcaster

Open Rocket Broadcaster on your computer:

1. **Server Settings:**
   - Server: `98.93.42.61`
   - Port: `8000`
   - Password: `MyRadio2025!` (the source password you set)
   - Mount Point: `/stream`
   - Format: MP3
   - Bitrate: 128 kbps

2. **Click "Connect"**
   - Should show "Connected" ✅

3. **Start Broadcasting:**
   - Play some audio/music
   - Click "Start Broadcast"

### Step 7: Update Your Next.js App

Edit `.env.local`:
```env
# Update these lines:
STREAM_URL=http://98.93.42.61:8000/stream
STREAM_HOST=98.93.42.61
STREAM_PORT=8000
STREAM_MOUNT=/stream
```

Restart your Next.js app:
```bash
npm run dev
```

### Step 8: Test Everything!

1. **Admin Panel:**
   - Go to: `http://localhost:3000/admin/login`
   - Login with: `ibrahim.saliman.zainab@gmail.com` / `admin100%`
   - Go to: `http://localhost:3000/admin/live`
   - Click "Go Live"
   - Set title: "Test Broadcast"
   - Set lecturer: "Sheikh Test"

2. **Listen to Your Radio:**
   - Open: `http://localhost:3000/radio`
   - You should see: **"🔴 LIVE NOW"**
   - Click the **Play button** ▶️
   - **You should hear your audio!** 🎉

3. **Check Listener Count:**
   - Go back to admin panel
   - You should see: **"Listeners: 1"**

## How Users Know Radio is ON

### 1. **LIVE Indicator** (Automatic)

When you click "Go Live" in admin panel:
- ✅ `/radio` page shows **"🔴 LIVE NOW"** badge
- ✅ Animated red pulsing indicator
- ✅ Shows lecture title and lecturer name
- ✅ Play button becomes active

### 2. **Homepage Shows Live Status**

On the homepage (`/`):
- ✅ Shows **"LIVE NOW"** badge at top
- ✅ Animated indicator
- ✅ "Listen Now" button highlighted

### 3. **API Endpoint**

Anyone can check: `http://localhost:3000/api/live`

Returns:
```json
{
  "ok": true,
  "isLive": true,
  "title": "Test Broadcast",
  "lecturer": "Sheikh Test",
  "startedAt": "2025-12-08T10:30:00.000Z"
}
```

## Complete Test Checklist

- [ ] Icecast installed on server
- [ ] Icecast running: `sudo systemctl status icecast2`
- [ ] Firewall port 8000 open
- [ ] Can access: `http://98.93.42.61:8000`
- [ ] Rocket Broadcaster connected
- [ ] Broadcasting audio
- [ ] `.env.local` updated with server IP
- [ ] Next.js app restarted
- [ ] Admin panel: Clicked "Go Live"
- [ ] `/radio` page shows "LIVE NOW"
- [ ] Can hear audio when clicking play
- [ ] Listener count shows 1

## Troubleshooting

### Can't Access http://98.93.42.61:8000

**Check Icecast is running:**
```bash
sudo systemctl status icecast2
```

**Check firewall:**
```bash
sudo ufw status
# Should show: 8000/tcp ALLOW
```

**Check if Icecast is listening:**
```bash
sudo netstat -tlnp | grep 8000
# Should show icecast2 listening on port 8000
```

### Rocket Broadcaster Won't Connect

**Check:**
1. Server IP is correct: `98.93.42.61`
2. Port is: `8000`
3. Password matches what you set in Icecast
4. Mount point is: `/stream`

**Test connection manually:**
```bash
telnet 98.93.42.61 8000
# Should connect (press Ctrl+] then type 'quit')
```

### Radio Page Shows Offline

**Check:**
1. Did you click "Go Live" in admin panel?
2. Check: `http://localhost:3000/api/live`
3. Should show: `"isLive": true`

**If still offline:**
```bash
# Check MongoDB connection
curl http://localhost:3000/api/db-test
```

### Can't Hear Audio

**Check:**
1. Rocket Broadcaster is connected
2. Audio is playing in Rocket Broadcaster
3. Volume is up in browser
4. Try different browser
5. Check browser console for errors

**Test stream directly:**
Open in browser: `http://98.93.42.61:8000/stream`
- Should prompt to download/play audio file

## Next Steps After Testing

### 1. Get a Domain Name (Optional but Recommended)

Instead of `98.93.42.61`, use `radio.yourdomain.com`:

1. Buy domain (Namecheap, GoDaddy, etc.)
2. Add A record: `radio` → `98.93.42.61`
3. Wait for DNS propagation (5-30 minutes)
4. Update `.env.local` with domain

### 2. Add HTTPS (Recommended)

Follow `NGINX_HTTPS_SETUP.md` to:
- Install Nginx
- Get free SSL certificate (Let's Encrypt)
- Use `https://radio.yourdomain.com/stream`

### 3. Add Fallback Playlist (Optional)

Follow `LIQUIDSOAP_SETUP.md` to:
- Auto-play music when not live
- Seamless transitions
- Professional setup

## Quick Commands Reference

```bash
# SSH to server
ssh -i radio-key.pem ubuntu@98.93.42.61

# Check Icecast status
sudo systemctl status icecast2

# Restart Icecast
sudo systemctl restart icecast2

# View Icecast logs
sudo tail -f /var/log/icecast2/error.log

# Check who's listening
curl http://98.93.42.61:8000/status-json.xsl

# Open firewall port
sudo ufw allow 8000/tcp

# Check open ports
sudo netstat -tlnp | grep 8000
```

## Summary

**To go live:**
1. ✅ Install Icecast on server (10 min)
2. ✅ Configure and start Icecast (5 min)
3. ✅ Connect Rocket Broadcaster (2 min)
4. ✅ Update `.env.local` (1 min)
5. ✅ Click "Go Live" in admin panel (1 min)
6. ✅ Users see "LIVE NOW" and can listen! 🎉

**Users know radio is on when:**
- 🔴 "LIVE NOW" badge appears
- ✅ Lecture title shows
- ✅ Play button works
- ✅ They can hear audio!

---

**Need help?** Check the logs:
```bash
# Icecast logs
sudo tail -f /var/log/icecast2/error.log

# Next.js logs
# Check terminal where you ran 'npm run dev'
```

**Ready to go live?** Follow the steps above and you'll be broadcasting in 30 minutes! 🎙️
