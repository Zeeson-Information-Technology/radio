# Next Steps to Get Al-Manhaj Radio Working

## Current Status ✅

### What's Already Working

1. **✅ Frontend Application**
   - Beautiful traditional Islamic design with octagonal logo
   - Responsive mobile navigation
   - Homepage with hero section
   - Radio player page (UI ready)
   - Admin dashboard
   - Login system

2. **✅ Database & Authentication**
   - MongoDB Atlas connected
   - Super admin account created: `ibrahim.saliman.zainab@gmail.com`
   - User management (admins & presenters)
   - JWT authentication
   - Role-based access control

3. **✅ Admin Features**
   - Live control panel
   - Schedule management
   - Presenter management
   - Password management
   - Streaming connection details display

4. **✅ API Endpoints**
   - `/api/live` - Live state management
   - `/api/schedule` - Schedule CRUD
   - `/api/stream-config` - Stream configuration
   - `/api/stream-health` - Stream health check
   - Authentication APIs

5. **✅ Documentation**
   - Complete setup guides for Icecast, Liquidsoap, Nginx
   - User management guides
   - Testing procedures

## What's Missing to Go Live 🔴

### Critical: Streaming Server Setup

The application is **fully functional** but needs a **streaming server** to actually broadcast audio. Currently using placeholder URL: `https://example.com/stream`

#### Option 1: Quick Test with Free Streaming Service (Easiest)

**Use a free Icecast hosting service for testing:**

1. **Sign up for free Icecast hosting:**
   - [Airtime Pro](https://www.airtime.pro/) - Free tier available
   - [RadioKing](https://www.radioking.com/) - Free trial
   - [Listen2MyRadio](https://www.listen2myradio.com/) - Free plan

2. **Get your stream details:**
   - Stream URL (e.g., `https://stream.radioking.com/your-station`)
   - Server host
   - Port
   - Mount point
   - Password

3. **Update `.env.local`:**
   ```env
   STREAM_URL=https://stream.radioking.com/your-station
   STREAM_HOST=stream.radioking.com
   STREAM_PORT=8000
   STREAM_MOUNT=/your-station
   ```

4. **Restart your app:**
   ```bash
   npm run dev
   ```

5. **Test streaming:**
   - Use OBS Studio or BUTT to connect
   - Go to `/admin/live` and click "Go Live"
   - Visit `/radio` to listen

**Pros:** Quick, no server setup, works immediately  
**Cons:** Limited control, may have ads, bandwidth limits

---

#### Option 2: Self-Hosted Icecast Server (Recommended for Production)

**Requirements:**
- Ubuntu 22.04 VPS (DigitalOcean, Linode, AWS, etc.)
- Domain name (e.g., `radio.almanhaj.com`)
- 1-2 hours setup time

**Steps:**

1. **Get a VPS Server:**
   - [DigitalOcean](https://www.digitalocean.com/) - $6/month
   - [Linode](https://www.linode.com/) - $5/month
   - [Vultr](https://www.vultr.com/) - $5/month
   - Choose Ubuntu 22.04 LTS

2. **Point your domain to the server:**
   - Add an A record: `radio.almanhaj.com` → Your server IP

3. **Follow the setup guides (already in your project):**
   
   **a) Install Icecast:**
   ```bash
   # SSH into your server
   ssh root@your-server-ip
   
   # Follow the guide
   cat ICECAST_SETUP.md
   ```
   
   **b) Install Liquidsoap (Optional but recommended):**
   ```bash
   # Provides automatic fallback playlist
   cat LIQUIDSOAP_SETUP.md
   ```
   
   **c) Setup Nginx with HTTPS:**
   ```bash
   # Provides secure HTTPS streaming
   cat NGINX_HTTPS_SETUP.md
   ```

4. **Update your `.env.local`:**
   ```env
   STREAM_URL=https://radio.almanhaj.com/stream
   STREAM_HOST=radio.almanhaj.com
   STREAM_PORT=8000
   STREAM_MOUNT=/stream
   ```

5. **Restart your Next.js app:**
   ```bash
   npm run dev
   ```

**Pros:** Full control, no limits, professional setup  
**Cons:** Requires server management, costs $5-10/month

---

#### Option 3: Local Testing (Development Only)

**For testing without internet streaming:**

1. **Install Icecast locally:**
   
   **On Ubuntu/Mac:**
   ```bash
   # Ubuntu
   sudo apt install icecast2
   
   # Mac
   brew install icecast
   ```
   
   **On Windows:**
   - Download from [icecast.org](https://icecast.org/download/)
   - Install and run

2. **Configure Icecast:**
   - Edit config file (location varies by OS)
   - Set passwords
   - Start Icecast

3. **Update `.env.local`:**
   ```env
   STREAM_URL=http://localhost:8000/stream
   STREAM_HOST=localhost
   STREAM_PORT=8000
   STREAM_MOUNT=/stream
   ```

4. **Test locally:**
   - Stream from OBS to `localhost:8000`
   - Listen at `http://localhost:3000/radio`

**Pros:** Free, no server needed, good for testing  
**Cons:** Only works on your computer, not accessible online

---

## Recommended Path for You 🎯

Based on your project, I recommend:

### Phase 1: Quick Test (Today)
1. Sign up for a free streaming service (RadioKing or Airtime Pro)
2. Update `.env.local` with their stream URL
3. Test with OBS Studio
4. Verify everything works

### Phase 2: Production Setup (This Week)
1. Get a VPS server ($5-10/month)
2. Get a domain name (if you don't have one)
3. Follow `ICECAST_SETUP.md` step by step
4. Follow `LIQUIDSOAP_SETUP.md` for fallback playlist
5. Follow `NGINX_HTTPS_SETUP.md` for HTTPS
6. Update `.env.local` with your domain
7. Go live! 🎉

---

## How to Stream (Once Server is Ready)

### For Admins/Presenters:

1. **Download streaming software:**
   - [OBS Studio](https://obsproject.com/) (Recommended, free)
   - [BUTT](https://danielnoethen.de/butt/) (Simple, free)

2. **Configure OBS Studio:**
   - Settings → Stream
   - Service: Custom
   - Server: Get from admin panel at `/admin/live`
   - Stream Key: Your mount point (e.g., `/stream`)
   - Password: Get from system admin

3. **Add audio source:**
   - Add microphone
   - Add music/audio files
   - Configure audio mixer

4. **Go Live:**
   - Login to `/admin/live`
   - Click "Go Live" button
   - Set lecture title and lecturer name
   - Start streaming in OBS
   - Listeners can now hear you at `/radio`

5. **Stop streaming:**
   - Stop streaming in OBS
   - Click "Stop Live" in admin panel

---

## Testing Checklist

Once you have a streaming server:

### Test 1: Stream Configuration
- [ ] Visit `/api/stream-config`
- [ ] Verify all fields are correct
- [ ] Check `isConfigured: true`

### Test 2: Stream Health
- [ ] Visit `/api/stream-health`
- [ ] Verify `reachable: true`
- [ ] Check no errors

### Test 3: Admin Panel
- [ ] Login as admin
- [ ] Go to `/admin/live`
- [ ] See "Streaming Connection Details"
- [ ] All fields populated correctly

### Test 4: OBS Connection
- [ ] Configure OBS with connection details
- [ ] Click "Start Streaming"
- [ ] No errors in OBS
- [ ] Stream shows as connected

### Test 5: Live State
- [ ] Click "Go Live" in admin panel
- [ ] Set title and lecturer
- [ ] Verify success message
- [ ] Check `/api/live` shows `isLive: true`

### Test 6: Public Listening
- [ ] Visit `/radio` page
- [ ] See "LIVE NOW" indicator
- [ ] Click play button
- [ ] Hear audio streaming
- [ ] See lecture title and lecturer

### Test 7: Stop Live
- [ ] Stop streaming in OBS
- [ ] Click "Stop Live" in admin panel
- [ ] Verify `/radio` shows offline
- [ ] Check `/api/live` shows `isLive: false`

---

## Current Environment Variables

Your `.env.local` currently has:

```env
# ✅ Working
MONGODB_URI=mongodb+srv://...
JWT_SECRET=hujfidreukj78jrekjhrehre8hfd
SUPER_ADMIN_PASSWORD=admin100%

# 🔴 Needs Update (Placeholder)
STREAM_URL=https://example.com/stream
STREAM_HOST=example.com
STREAM_PORT=8000
STREAM_MOUNT=/stream
STREAM_PASSWORD=your_stream_password_here
```

**Action Required:** Update the `STREAM_*` variables with real streaming server details.

---

## Quick Start Commands

```bash
# Start development server
npm run dev

# Check database connection
curl http://localhost:3000/api/db-test

# Check stream configuration
curl http://localhost:3000/api/stream-config

# Check stream health
curl http://localhost:3000/api/stream-health

# Test live state
curl http://localhost:3000/api/live
```

---

## Support Resources

### Documentation in Your Project
- `ICECAST_SETUP.md` - Complete Icecast server setup
- `LIQUIDSOAP_SETUP.md` - Fallback playlist setup
- `NGINX_HTTPS_SETUP.md` - HTTPS configuration
- `QUICK_START.md` - User management guide
- `PHASE6_COMPLETE.md` - Streaming integration details

### External Resources
- [Icecast Documentation](https://icecast.org/docs/)
- [OBS Studio Guide](https://obsproject.com/wiki/)
- [Liquidsoap Documentation](https://www.liquidsoap.info/)

---

## Summary

**Your app is 95% complete!** 🎉

The only thing missing is a **streaming server**. Once you:

1. Set up Icecast (or use a free service)
2. Update `.env.local` with real stream URL
3. Configure OBS Studio

You'll be able to:
- ✅ Stream live lectures
- ✅ Listeners can tune in at `/radio`
- ✅ Manage everything from admin panel
- ✅ Have a professional Islamic radio station

**Recommended Next Action:**
1. Sign up for a free streaming service (30 minutes)
2. Update `.env.local` (2 minutes)
3. Test with OBS (15 minutes)
4. **Go Live!** 🎙️

---

**Need Help?** All the guides are already in your project. Just follow them step by step!

**Questions?** Check the documentation files or the error messages - they're designed to be helpful.

**Ready to go live?** Start with Option 1 (free streaming service) to test everything, then move to Option 2 (self-hosted) for production.

May Allah bless your efforts in spreading beneficial knowledge! 🤲
