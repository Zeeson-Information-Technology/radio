# AWS Architecture Diagram
## Al-Manhaj Radio - Current & Migration Setup

---

## 🏗️ Current Architecture (Old Account)

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────────┐
        │   Vercel     │ │ Listener │ │   Admin      │
        │ (Frontend)   │ │ Browser  │ │   Browser    │
        │              │ │          │ │              │
        │ almanhaj.    │ │ Plays    │ │ Uploads      │
        │ vercel.app   │ │ stream   │ │ audio files  │
        └──────┬───────┘ └────┬─────┘ └──────┬───────┘
               │              │              │
               │              │              │
        ┌──────┴──────────────┴──────────────┴──────┐
        │                                           │
        │         AWS Account (OLD)                 │
        │         Region: us-east-1                 │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │  EC2 Instance (98.93.42.61)         │  │
        │  │  ┌──────────────────────────────┐   │  │
        │  │  │ Icecast (Port 8000)          │   │  │
        │  │  │ - Streams audio to listeners │   │  │
        │  │  └──────────────────────────────┘   │  │
        │  │  ┌──────────────────────────────┐   │  │
        │  │  │ Gateway (Port 8080)          │   │  │
        │  │  │ - WebSocket server           │   │  │
        │  │  │ - Audio conversion           │   │  │
        │  │  │ - JWT authentication         │   │  │
        │  │  │ - FFmpeg processing          │   │  │
        │  │  └──────────────────────────────┘   │  │
        │  └─────────────────────────────────────┘  │
        │                    │                       │
        │                    │ (Upload/Download)    │
        │                    ▼                       │
        │  ┌─────────────────────────────────────┐  │
        │  │  S3 Bucket                          │  │
        │  │  almanhaj-radio-audio               │  │
        │  │                                     │  │
        │  │  ├── originals/                     │  │
        │  │  │   ├── 2024/01/                   │  │
        │  │  │   │   ├── file1.amr              │  │
        │  │  │   │   ├── file2.mp3              │  │
        │  │  │   │   └── ...                    │  │
        │  │  │   └── 2024/02/                   │  │
        │  │  │       └── ...                    │  │
        │  │  │                                  │  │
        │  │  └── playback/                      │  │
        │  │      ├── 2024/01/                   │  │
        │  │      │   ├── file1.mp3              │  │
        │  │      │   ├── file2.mp3              │  │
        │  │      │   └── ...                    │  │
        │  │      └── 2024/02/                   │  │
        │  │          └── ...                    │  │
        │  │                                     │  │
        │  │  Storage: ~1-3 GB                   │  │
        │  │  Cost: $0.50-$5.10/month            │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │  MongoDB Atlas (External)           │  │
        │  │  - Live state                       │  │
        │  │  - User data                        │  │
        │  │  - Schedule info                    │  │
        │  │  Cost: Free tier                    │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        └───────────────────────────────────────────┘

Monthly Cost Breakdown:
├── S3 Storage:        $0.05
├── S3 Requests:       $0.02
├── S3 Data Transfer:  $0.50
├── EC2 Compute:       $7.50
├── EC2 Storage:       $2.00
├── EC2 Data Transfer: $0.50
└── Total:             $10.57/month
```

---

## 🚀 New Architecture (After Migration)

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────────┐
        │   Vercel     │ │ Listener │ │   Admin      │
        │ (Frontend)   │ │ Browser  │ │   Browser    │
        │              │ │          │ │              │
        │ almanhaj.    │ │ Plays    │ │ Uploads      │
        │ vercel.app   │ │ stream   │ │ audio files  │
        └──────┬───────┘ └────┬─────┘ └──────┬───────┘
               │              │              │
               │              │              │
        ┌──────┴──────────────┴──────────────┴──────┐
        │                                           │
        │         AWS Account (NEW)                 │
        │         Region: us-east-1                 │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │  EC2 Instance (NEW IP)              │  │
        │  │  ┌──────────────────────────────┐   │  │
        │  │  │ Icecast (Port 8000)          │   │  │
        │  │  │ - Streams audio to listeners │   │  │
        │  │  └──────────────────────────────┘   │  │
        │  │  ┌──────────────────────────────┐   │  │
        │  │  │ Gateway (Port 8080)          │   │  │
        │  │  │ - WebSocket server           │   │  │
        │  │  │ - Audio conversion           │   │  │
        │  │  │ - JWT authentication         │   │  │
        │  │  │ - FFmpeg processing          │   │  │
        │  │  └──────────────────────────────┘   │  │
        │  └─────────────────────────────────────┘  │
        │                    │                       │
        │                    │ (Upload/Download)    │
        │                    ▼                       │
        │  ┌─────────────────────────────────────┐  │
        │  │  S3 Bucket (NEW)                    │  │
        │  │  almanhaj-radio-audio               │  │
        │  │                                     │  │
        │  │  ├── originals/                     │  │
        │  │  │   ├── 2024/01/                   │  │
        │  │  │   │   ├── file1.amr              │  │
        │  │  │   │   ├── file2.mp3              │  │
        │  │  │   │   └── ...                    │  │
        │  │  │   └── 2024/02/                   │  │
        │  │  │       └── ...                    │  │
        │  │  │                                  │  │
        │  │  └── playback/                      │  │
        │  │      ├── 2024/01/                   │  │
        │  │      │   ├── file1.mp3              │  │
        │  │      │   ├── file2.mp3              │  │
        │  │      │   └── ...                    │  │
        │  │      └── 2024/02/                   │  │
        │  │          └── ...                    │  │
        │  │                                     │  │
        │  │  Storage: ~1-3 GB (COPIED)          │  │
        │  │  Cost: $0.50-$5.10/month            │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │  MongoDB Atlas (External)           │  │
        │  │  - Live state                       │  │
        │  │  - User data                        │  │
        │  │  - Schedule info                    │  │
        │  │  Cost: Free tier                    │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        └───────────────────────────────────────────┘

Monthly Cost Breakdown (SAME):
├── S3 Storage:        $0.05
├── S3 Requests:       $0.02
├── S3 Data Transfer:  $0.50
├── EC2 Compute:       $7.50
├── EC2 Storage:       $2.00
├── EC2 Data Transfer: $0.50
└── Total:             $10.57/month
```

---

## 📊 Data Flow Diagram

### Upload Flow
```
Admin Browser
    │
    ├─ Select audio file
    │
    ▼
Vercel (Frontend)
    │
    ├─ Validate file
    ├─ Show progress
    │
    ▼
Next.js API (/api/audio/upload)
    │
    ├─ Authenticate user
    ├─ Validate format
    │
    ▼
AWS S3 (originals/)
    │
    ├─ Store original file
    │
    ▼
Gateway (Audio Conversion)
    │
    ├─ Download from S3
    ├─ Convert to MP3 (FFmpeg)
    ├─ Upload MP3 to S3 (playback/)
    │
    ▼
Database Update
    │
    └─ Mark as "ready"
```

### Playback Flow
```
Listener Browser
    │
    ├─ Visit almanhaj.vercel.app/radio
    │
    ▼
Vercel (Frontend)
    │
    ├─ Load schedule
    ├─ Show current broadcast
    │
    ▼
Audio Player
    │
    ├─ If live: Connect to Icecast stream
    │   └─ http://98.93.42.61:8000/stream
    │
    ├─ If pre-recorded: Download from S3
    │   └─ https://almanhaj-radio-audio.s3.amazonaws.com/playback/...
    │
    ▼
Browser Audio Element
    │
    └─ Play audio to listener
```

### Broadcasting Flow
```
Admin Browser
    │
    ├─ Click "Start Broadcasting"
    │
    ▼
Vercel (Frontend)
    │
    ├─ Get broadcast token
    │
    ▼
BrowserEncoder (WebRTC)
    │
    ├─ Capture microphone audio
    ├─ Encode to PCM
    │
    ▼
Gateway WebSocket (Port 8080)
    │
    ├─ Receive audio stream
    ├─ Pass to FFmpeg
    │
    ▼
FFmpeg Process
    │
    ├─ Encode PCM to MP3
    ├─ Apply audio filters
    │
    ▼
Icecast Server (Port 8000)
    │
    ├─ Receive MP3 stream
    ├─ Broadcast to listeners
    │
    ▼
Listener Browsers
    │
    └─ Receive live stream
```

---

## 🔄 Migration Data Flow

```
Old AWS Account                    New AWS Account
┌──────────────────┐              ┌──────────────────┐
│  S3 Bucket       │              │  S3 Bucket       │
│  almanhaj-radio- │              │  almanhaj-radio- │
│  audio           │              │  audio           │
│                  │              │                  │
│  ├── originals/  │              │  ├── originals/  │
│  │   └── files   │──────────────│  │   └── files   │
│  │               │   aws s3     │  │               │
│  └── playback/   │   sync       │  └── playback/   │
│      └── files   │──────────────│      └── files   │
│                  │              │                  │
│  ~1-3 GB         │              │  ~1-3 GB         │
└──────────────────┘              └──────────────────┘
        │                                  │
        │                                  │
        └──────────────────────────────────┘
                    │
                    ▼
            Update Credentials
            in all locations:
            ├── .env.local
            ├── gateway/.env
            ├── Vercel env vars
            └── EC2 environment
```

---

## 🎯 Key Components

### 1. Vercel (Frontend)
- **Purpose:** Host Next.js application
- **Cost:** Free tier
- **Handles:** Admin panel, listener UI, API routes
- **Credentials:** AWS keys in environment variables

### 2. EC2 (Gateway + Icecast)
- **Purpose:** Audio streaming and conversion
- **Cost:** $7.50-$10/month
- **Handles:** WebSocket, FFmpeg, Icecast streaming
- **Credentials:** AWS keys in .env file

### 3. S3 (Audio Storage)
- **Purpose:** Store original and converted audio files
- **Cost:** $0.50-$5/month
- **Handles:** Upload, download, playback
- **Credentials:** AWS keys for API access

### 4. MongoDB Atlas (Database)
- **Purpose:** Store application data
- **Cost:** Free tier
- **Handles:** Live state, user data, schedules
- **Credentials:** Connection string in .env

---

## 📈 Scalability

### Current Setup (100-1000 listeners)
```
✅ Vercel: Handles unlimited concurrent users
✅ EC2 t3.micro: Handles 100+ concurrent streams
✅ S3: Unlimited storage and requests
✅ MongoDB: Free tier handles 512 MB
```

### If You Scale (10,000+ listeners)
```
⚠️ EC2 t3.micro: May need upgrade to t3.small
⚠️ MongoDB: May need paid tier
✅ S3: No changes needed
✅ Vercel: No changes needed
```

### Upgrade Path
```
Current: t3.micro ($7.50/month)
    ↓
Scale 1: t3.small ($15/month)
    ↓
Scale 2: t3.medium ($30/month)
    ↓
Scale 3: t3.large ($60/month)
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────┐
│         Internet (Public)                │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ┌────────┐        ┌────────┐
    │ Vercel │        │ EC2    │
    │ HTTPS  │        │ HTTP   │
    └────────┘        └────────┘
        │                 │
        │                 │
    ┌───┴─────────────────┴───┐
    │                         │
    │  AWS Account (Private)  │
    │                         │
    │  ┌─────────────────┐    │
    │  │ S3 Bucket       │    │
    │  │ (Private)       │    │
    │  │ Credentials:    │    │
    │  │ - IAM User      │    │
    │  │ - Access Keys   │    │
    │  │ - Bucket Policy │    │
    │  └─────────────────┘    │
    │                         │
    │  ┌─────────────────┐    │
    │  │ EC2 Instance    │    │
    │  │ Security Group: │    │
    │  │ - Port 8000     │    │
    │  │ - Port 8080     │    │
    │  │ - SSH (22)      │    │
    │  └─────────────────┘    │
    │                         │
    └─────────────────────────┘
```

---

## ✅ Migration Checklist

```
Pre-Migration:
  ☐ Document current setup
  ☐ Backup S3 data
  ☐ Note all credentials
  ☐ Create new AWS account

Migration:
  ☐ Create S3 bucket in new account
  ☐ Copy all files from old to new
  ☐ Update .env.local
  ☐ Update gateway/.env
  ☐ Update Vercel environment variables
  ☐ Update EC2 environment

Post-Migration:
  ☐ Test local development
  ☐ Test Vercel deployment
  ☐ Test EC2 gateway
  ☐ Test file upload
  ☐ Test audio playback
  ☐ Test live broadcasting
  ☐ Verify no errors in logs

Cleanup:
  ☐ Delete old S3 bucket
  ☐ Revoke old credentials
  ☐ Close old AWS account (optional)
```

---

## 📞 Support

For detailed information, see:
- `AWS_USAGE_AND_PRICING_ANALYSIS.md` - Full pricing breakdown
- `AWS_MIGRATION_QUICK_REFERENCE.md` - Step-by-step migration
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Deployment procedures
- `EC2_DEPLOYMENT_SAFE.md` - EC2 setup guide
