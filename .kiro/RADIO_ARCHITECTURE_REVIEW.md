# Radio Architecture Review & Next Steps

## Current State: What We Have ✅

### Frontend (Next.js)
- **Radio Player Page**: `app/radio/page.tsx` - Public-facing player
- **Fetches data from**:
  - `/api/live` - Live broadcast state (isLive, currentAudioFile, title, lecturer)
  - `/api/schedule` - Broadcast schedule
- **Stream URL**: Currently `http://localhost:8080/test-stream` (local) or EC2 IP (production)

### Backend (Gateway - Node.js)
- **Location**: `gateway/` folder
- **Purpose**: WebSocket server for live audio injection + Icecast bridge
- **Services**:
  - `BroadcastService` - Manages live state, play/pause/stop controls
  - `AudioConversionService` - Converts audio formats for broadcasting
  - `AudioStateManager` - Caches live state
  - `DatabaseService` - MongoDB connection
  - `WebSocketHandler` - Receives browser audio, encodes to MP3, sends to Icecast

### Storage (DigitalOcean Spaces)
- **Audio Files**: Stored in `almanhaj-radio` bucket
- **CDN URL**: `https://almanhaj-radio.lon1.cdn.digitaloceanspaces.com/`
- **Upload Endpoint**: `/api/audio/upload` - Uploads to DigitalOcean + database

### Infrastructure
- **Frontend**: Vercel (almanhaj.vercel.app)
- **Backend Gateway**: DigitalOcean Droplet ($6/mo)
  - Node.js gateway server on port 8080
  - Icecast on port 8000
  - MongoDB Atlas (shared)
- **Stream Output**: Icecast (port 8000) → HTTP stream
- **Database**: MongoDB Atlas

---

## Current Issues & Gaps 🚨

### 1. **Gateway ↔ DigitalOcean Integration**
- **Issue**: Gateway currently has hard-coded references to old AWS/EC2 IP (98.93.42.61)
- **Missing**: 
  - Icecast streaming from DigitalOcean Droplet
  - Audio playback injection from audio library into live stream
  - No automatic fallback to audio library files for pre-recorded broadcasts

### 2. **Live Audio File Injection**
- **Missing**: Ability to inject audio files from library into live broadcast
- **Current**: Only browser audio via WebSocket
- **Needed**: Background audio file streaming when no live presenter

### 3. **Stream Health & Monitoring**
- **Issue**: No visibility into stream status
- **Missing**: Health checks, uptime monitoring, error recovery

### 4. **Radio Player Features**
- **Missing**: 
  - Audio library integration (show available files)
  - Schedule display with proper timezone handling
  - Listener count tracking
  - Quality/bitrate selection

---

## What We Need To Do Next 🔧

### Phase 1: Gateway Configuration (Critical)
1. **Update gateway `.env`** to use DigitalOcean Droplet IP instead of EC2
2. **Configure Icecast** on DigitalOcean Droplet:
   - Port 8000 (streaming)
   - Enable CORS headers
   - Set proper MIME types for audio
3. **Test stream connectivity**:
   - Gateway → Icecast
   - Browser → Icecast stream

### Phase 2: Audio File Injection
1. **Create API endpoint**: `/api/admin/broadcast/inject-file`
   - Accept audio file ID from library
   - Stream file through gateway → Icecast
   - Manage playback (pause, skip, resume)

2. **Update BroadcastService**:
   - Support file streaming in addition to WebSocket audio
   - Queue management for multiple files

3. **Update Radio Player UI**:
   - Show current playing file
   - Display queue/schedule
   - Add file selection dropdown

### Phase 3: Stream Quality & Reliability
1. **Add bitrate detection** in gateway
2. **Implement error recovery** - auto-restart on disconnect
3. **Add health checks** - `/api/stream-health` endpoint
4. **Listener tracking** - count active listeners

### Phase 4: Radio Player Enhancement
1. **Show audio library** in player UI
2. **Display schedule** with next broadcasts
3. **Add listener notifications** - browser notifications for new broadcasts
4. **Mobile-friendly controls**

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Radio Player (app/radio/page.tsx)          │   │
│  │  - Fetches /api/live (current broadcast state)     │   │
│  │  - Fetches /api/schedule (next broadcasts)         │   │
│  │  - Displays audio library & playback controls      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
        ┌─────────────────────────────────────────────────────┐
        │          Next.js Backend API (Vercel)               │
        │  ┌────────────────────────────────────────────┐    │
        │  │  /api/live - Live broadcast state         │    │
        │  │  /api/schedule - Broadcast schedule       │    │
        │  │  /api/audio/upload - Audio upload         │    │
        │  │  /api/admin/broadcast/* - Broadcast ctrl  │    │
        │  │  /api/stream-health - Stream status       │    │
        │  └────────────────────────────────────────────┘    │
        └─────────────────────────────────────────────────────┘
                            ↓↑
   ┌────────────────────────────────────────────────────────────┐
   │     Gateway Server (DigitalOcean Droplet)                  │
   │  ┌──────────────────────────────────────────────────────┐  │
   │  │  WebSocket Handler (port 8080)                      │  │
   │  │  ├─ Receives browser audio                          │  │
   │  │  ├─ Receives file injection requests                │  │
   │  │  └─ Encodes audio to MP3                            │  │
   │  │                                                       │  │
   │  │  Broadcast Service                                  │  │
   │  │  ├─ Manages live state                              │  │
   │  │  ├─ Play/pause/stop controls                        │  │
   │  │  └─ Audio file queue management                     │  │
   │  │                                                       │  │
   │  │  Audio Conversion Service                           │  │
   │  │  └─ Format conversion (MP3, WAV, etc)               │  │
   │  └──────────────────────────────────────────────────────┘  │
   │                         ↓↑                                  │
   │  ┌──────────────────────────────────────────────────────┐  │
   │  │  Icecast Server (port 8000)                         │  │
   │  │  └─ HTTP stream endpoint: /stream                   │  │
   │  └──────────────────────────────────────────────────────┘  │
   └────────────────────────────────────────────────────────────┘
                            ↓↑
   ┌────────────────────────────────────────────────────────────┐
   │  DigitalOcean Spaces (S3-compatible)                      │
   │  └─ Audio library storage & delivery                      │
   └────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration Status ✅

### `.env.local` (Local Development)
- ✅ MongoDB URI
- ✅ DigitalOcean Spaces credentials
- ✅ Local gateway URL: `http://localhost:8080`
- ✅ Local stream URL: `http://localhost:8080/test-stream`

### `gateway/.env` (Production Droplet)
- ✅ MongoDB URI
- ✅ DigitalOcean Spaces credentials
- ⚠️ NEXTJS_URL needs verification
- ⚠️ Icecast configuration needs setup on droplet
- ⚠️ AWS credentials match DigitalOcean setup

### Missing/Needs Update
- Icecast password (currently: `live-source-82736`)
- DigitalOcean Droplet IP address
- CORS headers for stream delivery

---

## Quick Action Items

### Immediate (This session)
- [ ] Verify DigitalOcean Droplet is running
- [ ] Confirm Icecast is installed/running on droplet
- [ ] Test connection: Gateway → Icecast
- [ ] Update stream URL in env files to actual droplet IP

### Next Session
- [ ] Implement audio file injection endpoint
- [ ] Update BroadcastService to handle file streaming
- [ ] Add file queue management
- [ ] Enhance Radio Player UI

### Future Improvements
- [ ] Add listener statistics
- [ ] Implement stream health monitoring
- [ ] Add broadcast scheduling UI
- [ ] Mobile app development

---

## Files to Check/Update

```
gateway/
├── server.js (main entry point)
├── .env (production config)
├── services/
│   ├── BroadcastService.js (add file injection)
│   ├── AudioConversionService.js
│   ├── DatabaseService.js
│   └── AudioStateManager.js
├── websocket/
│   └── WebSocketHandler.js (add file streaming support)
└── routes/
    ├── broadcast.js (add file injection routes)
    └── health.js

app/
├── api/
│   ├── live/ (live state endpoint)
│   ├── schedule/ (schedule endpoint)
│   └── admin/broadcast/ (broadcast control endpoints)
└── radio/
    ├── page.tsx (radio player page)
    └── RadioPlayer.tsx (player component)
```
