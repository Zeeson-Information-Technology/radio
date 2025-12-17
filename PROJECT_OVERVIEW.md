# Al-Manhaj Radio - Project Overview

## 🎯 What This Application Does

**Al-Manhaj Radio** is a complete Islamic radio broadcasting platform that enables live audio streaming from web browsers directly to listeners worldwide. Think of it as a "Zoom for Islamic radio" - presenters can broadcast live lectures from their browser, and listeners can tune in from anywhere.

## 🏗️ System Architecture

### Frontend (Next.js 14 - Vercel)
- **Live URL**: `https://almanhaj.vercel.app`
- **Admin Panel**: Browser-based broadcasting interface
- **Listener Page**: Real-time audio streaming player
- **Audio Library**: Recorded lectures with AMR→MP3 conversion

### Backend Infrastructure
- **Gateway Server**: Node.js WebSocket server on AWS EC2 (`98.93.42.61:8080`)
- **Icecast Server**: Audio streaming server on same EC2 (`98.93.42.61:8000`)
- **Database**: MongoDB Atlas (cloud-hosted)
- **File Storage**: AWS S3 for audio recordings

## 🎙️ Core Features Currently Working

### 1. **Live Broadcasting System**
- ✅ **Browser-to-Server Audio**: Presenters broadcast directly from web browser
- ✅ **Real-time Processing**: Audio captured via WebRTC → WebSocket → FFmpeg → Icecast
- ✅ **Live Stream**: Listeners access stream at `https://almanhaj.duckdns.org/stream`
- ✅ **Mute/Unmute**: Presenters can mute during broadcast without stopping
- ✅ **Emergency Stop**: Super admins can force-stop any broadcast

### 2. **Real-time Updates**
- ✅ **Server-Sent Events**: Listeners get instant notifications when broadcasts start/stop
- ✅ **Live Status**: Real-time broadcast status across all pages
- ✅ **Auto-refresh**: No manual page refresh needed

### 3. **User Management**
- ✅ **JWT Authentication**: Secure admin login system
- ✅ **Role-based Access**: Super admins, regular admins, presenters
- ✅ **Session Management**: Secure broadcast sessions

### 4. **Audio Library**
- ✅ **Recording Upload**: Admins can upload AMR audio files
- ✅ **Automatic Conversion**: AMR files converted to MP3 for web playback
- ✅ **S3 Storage**: Scalable cloud storage for audio files
- ✅ **Playback Interface**: Web-based audio player for recorded lectures

### 5. **Scheduling System**
- ✅ **Weekly Schedule**: Configure recurring broadcast times
- ✅ **Timezone Support**: Automatic timezone conversion for users
- ✅ **Schedule Display**: Shows upcoming programs on listener page

## 🔧 Technical Implementation

### Broadcasting Flow
```
Browser (WebRTC) → WebSocket → Gateway Server → FFmpeg → Icecast → Listeners
```

1. **Audio Capture**: Browser captures microphone via WebRTC
2. **WebSocket Transmission**: Raw audio sent to gateway server
3. **FFmpeg Processing**: Audio encoded to MP3 with low latency
4. **Icecast Streaming**: MP3 stream broadcast to listeners
5. **Real-time Updates**: SSE notifies listeners of broadcast changes

### Recent Major Refactoring (Dec 2025)
- ✅ **Modular Architecture**: Broke down 1,188-line monolithic server into 10 focused modules
- ✅ **Improved Maintainability**: Clear separation of concerns
- ✅ **Better Testing**: Individual modules can be tested independently
- ✅ **Enhanced Debugging**: Easier to trace and fix issues

## 📁 Project Structure

```
online-radio/
├── app/                          # Next.js 14 App Router
│   ├── admin/                    # Admin interfaces
│   │   ├── live/                 # Live broadcasting panel
│   │   └── audio/                # Audio library management
│   ├── radio/                    # Listener page
│   ├── library/                  # Public audio library
│   └── api/                      # API routes
│       ├── live/                 # Live broadcast APIs
│       ├── admin/                # Admin-only APIs
│       └── audio/                # Audio upload/conversion APIs
├── gateway/                      # Modular Gateway Server
│   ├── server.js                 # Main orchestration (~100 lines)
│   ├── config/                   # Configuration management
│   ├── services/                 # Business logic
│   │   ├── DatabaseService.js    # MongoDB operations
│   │   ├── BroadcastService.js   # FFmpeg & streaming
│   │   └── AudioConversionService.js # AMR→MP3 conversion
│   ├── routes/                   # API endpoints
│   ├── middleware/               # Authentication
│   └── websocket/                # WebSocket handling
├── lib/                          # Shared utilities
│   ├── models/                   # MongoDB schemas
│   └── timezone.js               # Timezone utilities
└── public/                       # Static assets
```

## 🌐 Live URLs & Access

### Public Access
- **Listener Page**: `https://almanhaj.vercel.app/radio`
- **Audio Library**: `https://almanhaj.vercel.app/library`
- **Live Stream**: `https://almanhaj.duckdns.org/stream`

### Admin Access (Requires Login)
- **Admin Dashboard**: `https://almanhaj.vercel.app/admin`
- **Live Broadcasting**: `https://almanhaj.vercel.app/admin/live`
- **Audio Management**: `https://almanhaj.vercel.app/admin/audio`

### Infrastructure
- **Gateway Server**: `http://98.93.42.61:8080` (WebSocket + API)
- **Icecast Server**: `http://98.93.42.61:8000` (Audio streaming)
- **EC2 SSH**: `ssh -i radio-key.pem ubuntu@98.93.42.61`

## 🔄 Current Development Status

### ✅ **Completed & Working**
- Live browser-to-listener broadcasting
- Real-time updates and notifications
- Audio library with conversion
- User authentication and roles
- Scheduling system
- Modular gateway architecture
- EC2 deployment with systemd services

### 🔧 **Recently Fixed (Dec 2025)**
- FFmpeg argument order issues
- Stream URL accessibility problems
- Modular refactoring for maintainability
- Real-time notification system
- Mute/unmute functionality

### 🎯 **Current Focus Areas**
- Stream accessibility optimization
- Audio quality fine-tuning
- Performance monitoring
- Error handling improvements

## 🛠️ Development Workflow

### Local Development
```bash
# Frontend (Next.js)
cd online-radio
npm run dev          # http://localhost:3000

# Gateway Server (for testing)
cd gateway
npm install
node server.js       # ws://localhost:8080
```

### Deployment Process
1. **Code Changes**: Develop and test locally
2. **Push to Main**: `git push origin main`
3. **Deploy Frontend**: Automatic via Vercel
4. **Update EC2**: Follow `EC2_UPDATE_PLAYBOOK.md`

### Key Configuration Files
- **Frontend Config**: `.env.local` (stream URLs, API endpoints)
- **Gateway Config**: `gateway/.env` (Icecast, MongoDB, AWS)
- **Database**: MongoDB Atlas connection strings
- **AWS**: S3 bucket for audio storage

## 🔐 Security & Authentication

### JWT-based Authentication
- **Issuer**: `almanhaj-radio`
- **Audience**: `broadcast-gateway`
- **Roles**: `super_admin`, `admin`, `presenter`

### CORS Configuration
- **Allowed Origins**: Vercel app, DuckDNS domain
- **WebSocket**: Token-based authentication
- **API Endpoints**: JWT middleware protection

## 📊 Monitoring & Logs

### Health Checks
- **Gateway Health**: `http://98.93.42.61:8080/health`
- **Service Status**: `sudo systemctl status almanhaj-gateway`
- **Icecast Status**: `http://98.93.42.61:8000`

### Log Monitoring
```bash
# Gateway logs
sudo journalctl -u almanhaj-gateway -f

# Icecast logs
sudo tail -f /var/log/icecast2/error.log
```

## 🎵 Audio Technical Specs

### Live Broadcasting
- **Sample Rate**: 22,050 Hz (optimized for voice)
- **Channels**: Mono (1 channel)
- **Bitrate**: 96 kbps (quality/latency balance)
- **Format**: MP3 (browser compatible)
- **Latency**: Ultra-low (~2-3 seconds)

### Audio Library
- **Upload Format**: AMR (mobile recordings)
- **Playback Format**: MP3 (web compatible)
- **Storage**: AWS S3 with CloudFront CDN
- **Conversion**: FFmpeg-based background processing

## 🚀 Getting Started for New Developers

### 1. **Repository Access**
```bash
git clone https://github.com/Zeeson-Information-Technology/radio.git
cd radio/online-radio
```

### 2. **Environment Setup**
- Copy `.env.example` to `.env.local`
- Get MongoDB connection string
- Configure AWS credentials for S3
- Set up JWT secret

### 3. **Local Development**
```bash
npm install
npm run dev
```

### 4. **Understanding the Codebase**
- Start with `app/radio/RadioPlayer.tsx` (listener interface)
- Review `app/admin/live/BrowserEncoder.tsx` (broadcasting interface)
- Examine `gateway/server.js` (main orchestration)
- Check `lib/models/` for database schemas

### 5. **Testing Broadcasting**
- Run gateway locally: `cd gateway && node server.js`
- Access admin panel: `http://localhost:3000/admin/live`
- Test listener page: `http://localhost:3000/radio`

## 📚 Key Documentation Files

- **`EC2_UPDATE_PLAYBOOK.md`**: Server deployment procedures
- **`GATEWAY_REFACTOR_SUMMARY.md`**: Recent modular refactoring details
- **`HOW_IT_WORKS.md`**: Technical architecture deep-dive
- **`QUICK_START.md`**: Setup and configuration guide

## 🎯 Business Context

**Al-Manhaj Radio** serves the Islamic community by providing:
- **Live Islamic Lectures**: Real-time religious education
- **Salafi Methodology**: Following the way of the righteous predecessors
- **Global Reach**: Accessible worldwide via web browsers
- **High Quality**: Professional-grade audio streaming
- **User-Friendly**: Simple interface for both presenters and listeners

The platform enables Islamic scholars and students to share knowledge effectively, reaching a global audience without complex broadcasting equipment - just a web browser and microphone.

---

**Last Updated**: December 16, 2025  
**Version**: 2.0 (Post-Modular Refactoring)  
**Status**: Production Ready  
**Maintainer**: Development Team