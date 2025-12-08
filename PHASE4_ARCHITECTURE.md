# Phase 4 Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PHASE 4 SYSTEM                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /radio (Public Radio Page)                                     │
│  ├─ page.tsx (Server Component)                                 │
│  │  └─ Fetches /api/live on server-side                         │
│  │                                                               │
│  └─ RadioPlayer.tsx (Client Component)                          │
│     ├─ Receives initial data                                    │
│     ├─ Polls /api/live every 30s                                │
│     ├─ Shows live/offline badge                                 │
│     ├─ Displays title, lecturer, time                           │
│     └─ Audio player with stream URL                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              ↓ HTTP GET

┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GET /api/live (Public)                                         │
│  ├─ No authentication required                                  │
│  ├─ Connects to MongoDB                                         │
│  ├─ Finds/creates LiveState document                            │
│  ├─ Returns: isLive, title, lecturer, startedAt, streamUrl      │
│  └─ Fallback on errors                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              ↓ MongoDB Query

┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MongoDB Atlas                                                  │
│  └─ livestates collection                                       │
│     └─ Single LiveState document                                │
│        ├─ isLive: boolean                                       │
│        ├─ title: string                                         │
│        ├─ lecturer: string                                      │
│        ├─ startedAt: Date | null                                │
│        └─ mount: string                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              ↑ ↓ Updates

┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /admin/live (Protected Admin Page)                             │
│  ├─ page.tsx (Server Component)                                 │
│  │  ├─ Checks authentication                                    │
│  │  └─ Redirects to login if not authenticated                  │
│  │                                                               │
│  └─ LiveControlPanel.tsx (Client Component)                     │
│     ├─ Fetches /api/live on mount                               │
│     ├─ Shows current status                                     │
│     ├─ Form: title, lecturer inputs                             │
│     ├─ "Go Live" → POST /api/admin/live/start                   │
│     ├─ "Stop Live" → POST /api/admin/live/stop                  │
│     └─ Success/error messages                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                    ↓ HTTP POST (with JWT cookie)

┌─────────────────────────────────────────────────────────────────┐
│                    PROTECTED API LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /api/admin/live/start                                     │
│  ├─ Requires JWT authentication                                 │
│  ├─ Allows: admin, presenter roles                              │
│  ├─ Body: { title, lecturer }                                   │
│  ├─ Updates LiveState:                                          │
│  │  ├─ isLive = true                                            │
│  │  ├─ title = from body                                        │
│  │  ├─ lecturer = from body                                     │
│  │  └─ startedAt = new Date()                                   │
│  └─ Returns: success message                                    │
│                                                                 │
│  POST /api/admin/live/stop                                      │
│  ├─ Requires JWT authentication                                 │
│  ├─ Allows: admin, presenter roles                              │
│  ├─ Updates LiveState:                                          │
│  │  ├─ isLive = false                                           │
│  │  └─ startedAt = null                                         │
│  └─ Returns: success message                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Public User Views Radio Page

```
User Browser
    ↓
GET /radio
    ↓
Server Component (page.tsx)
    ↓
GET /api/live (server-side)
    ↓
MongoDB (find LiveState)
    ↓
Return live data
    ↓
Render RadioPlayer with initial data
    ↓
Client Component (RadioPlayer.tsx)
    ↓
Poll GET /api/live every 30s
    ↓
Update UI with latest state
```

### 2. Admin Starts Live Stream

```
Admin Browser
    ↓
Login → JWT cookie set
    ↓
Navigate to /admin/live
    ↓
Server checks authentication
    ↓
Render LiveControlPanel
    ↓
Admin fills form (title, lecturer)
    ↓
Click "Go Live"
    ↓
POST /api/admin/live/start
    ├─ Verify JWT cookie
    ├─ Check user role
    └─ Update MongoDB
        ├─ isLive = true
        ├─ title = "Tafsir..."
        ├─ lecturer = "Sheikh..."
        └─ startedAt = now
    ↓
Return success
    ↓
Refresh UI
    ↓
Public page auto-refreshes (30s)
    ↓
Shows "LIVE NOW" badge
```

### 3. Admin Stops Live Stream

```
Admin Browser
    ↓
Click "Stop Live"
    ↓
POST /api/admin/live/stop
    ├─ Verify JWT cookie
    ├─ Check user role
    └─ Update MongoDB
        ├─ isLive = false
        └─ startedAt = null
    ↓
Return success
    ↓
Refresh UI
    ↓
Public page auto-refreshes (30s)
    ↓
Shows "OFFLINE" badge
```

## Component Hierarchy

```
App
├── Public Routes
│   ├── / (Home)
│   └── /radio
│       ├── page.tsx (Server)
│       └── RadioPlayer.tsx (Client)
│           ├── Live Status Badge
│           ├── Title & Lecturer Display
│           ├── Time Display
│           └── Audio Player
│
└── Protected Routes (Admin)
    ├── /admin/login
    ├── /admin/live
    │   ├── page.tsx (Server)
    │   └── LiveControlPanel.tsx (Client)
    │       ├── Current Status Display
    │       ├── Form (title, lecturer)
    │       ├── Go Live Button
    │       ├── Stop Live Button
    │       └── Quick Actions
    │
    ├── /admin/presenters
    └── /admin/change-password
```

## API Endpoints Map

```
/api
├── live (GET) ..................... Public live state
└── admin
    ├── login (POST) ............... User authentication
    ├── logout (POST) .............. User logout
    ├── change-password (POST) ..... Change password
    ├── presenters (GET, POST) ..... Manage presenters
    └── live
        ├── start (POST) ........... Start live stream
        └── stop (POST) ............ Stop live stream
```

## Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ POST /api/admin/login
       │ { email, password }
       ↓
┌─────────────────────┐
│   Login API         │
│  ├─ Verify password │
│  ├─ Sign JWT token  │
│  └─ Set HTTP-only   │
│     cookie          │
└──────┬──────────────┘
       │
       │ Set-Cookie: admin_token=...
       ↓
┌─────────────┐
│   Browser   │
│  (has cookie)│
└──────┬──────┘
       │
       │ POST /api/admin/live/start
       │ Cookie: admin_token=...
       ↓
┌─────────────────────┐
│  Protected API      │
│  ├─ Read cookie     │
│  ├─ Verify JWT      │
│  ├─ Check role      │
│  └─ Process request │
└─────────────────────┘
```

## Database Schema

```
LiveState Collection (Singleton)
┌─────────────────────────────────┐
│ _id: ObjectId                   │
│ isLive: Boolean                 │
│ mount: String ("/stream")       │
│ title: String                   │
│ lecturer: String                │
│ startedAt: Date | null          │
│ updatedAt: Date                 │
└─────────────────────────────────┘
        ↑
        │ Only ONE document exists
        │ Created automatically if missing
        │ Updated by admin/presenter
```

## State Management

```
┌─────────────────────────────────────────┐
│         Single Source of Truth          │
│                                         │
│  MongoDB LiveState Document             │
│  ├─ isLive: false                       │
│  ├─ title: "Offline"                    │
│  ├─ lecturer: ""                        │
│  └─ startedAt: null                     │
│                                         │
└─────────────────────────────────────────┘
              ↓           ↑
              │           │
    ┌─────────┴───────────┴─────────┐
    │                               │
    ↓                               ↓
┌─────────┐                   ┌─────────┐
│ Public  │                   │  Admin  │
│  Page   │                   │  Panel  │
│         │                   │         │
│ Reads   │                   │ Reads & │
│ every   │                   │ Writes  │
│ 30s     │                   │         │
└─────────┘                   └─────────┘
```

## Technology Stack

```
Frontend
├── Next.js 15 (App Router)
├── React 19
├── TypeScript
└── Tailwind CSS

Backend
├── Next.js API Routes
├── MongoDB (Mongoose)
└── JWT Authentication

Infrastructure
├── MongoDB Atlas (Database)
├── Vercel (Hosting - optional)
└── Environment Variables
```

## Security Layers

```
┌─────────────────────────────────────────┐
│         Security Architecture           │
└─────────────────────────────────────────┘

Public Endpoints
├── GET /api/live
│   ├─ No authentication
│   ├─ Read-only
│   └─ No sensitive data

Protected Endpoints
├── POST /api/admin/live/start
├── POST /api/admin/live/stop
│   ├─ JWT authentication required
│   ├─ HTTP-only cookies
│   ├─ Role-based access (admin/presenter)
│   ├─ Token verification
│   └─ User validation

Cookie Security
├── httpOnly: true (XSS protection)
├── secure: true (HTTPS only in prod)
├── sameSite: 'strict' (CSRF protection)
└── 7-day expiration
```

## Performance Optimizations

```
Server-Side Rendering
├── Initial page load with fresh data
├── Fast first contentful paint
└── SEO friendly

Client-Side Updates
├── 30-second polling interval
├── No full page reloads
└── Smooth UI updates

Database
├── Single document queries (fast)
├── Indexed by default (_id)
└── Minimal data transfer

Caching
├── No cache for live data (always fresh)
├── Static assets cached
└── API responses not cached
```

## Error Handling

```
┌─────────────────────────────────────────┐
│         Error Handling Strategy         │
└─────────────────────────────────────────┘

API Level
├── Try-catch blocks
├── Graceful fallbacks
├── User-friendly error messages
└── Proper HTTP status codes

Client Level
├── Catch fetch errors
├── Show error messages
├── Fallback UI states
└── Retry mechanisms

Database Level
├── Connection error handling
├── Create missing documents
├── Transaction safety
└── Validation errors
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Production Deployment           │
└─────────────────────────────────────────┘

Vercel (Frontend + API)
├── Next.js application
├── API routes
├── Static assets
└── Environment variables

MongoDB Atlas (Database)
├── Managed MongoDB cluster
├── Automatic backups
├── Global distribution
└── Security features

Environment Variables
├── MONGODB_URI (connection string)
├── JWT_SECRET (token signing)
├── STREAM_URL (streaming server)
└── Other config values
```

## Monitoring & Logging

```
Development
├── Console.log for debugging
├── Browser DevTools
├── Network tab inspection
└── React DevTools

Production (Future)
├── Error tracking (Sentry)
├── Performance monitoring
├── User analytics
└── API logging
```

## Future Enhancements (Post-Phase 5)

```
Planned Features
├── WebSocket for real-time updates
├── Listener count tracking
├── Chat functionality
├── Schedule management
├── Episode recording
├── Push notifications
├── Mobile app
└── Advanced analytics
```

---

**Architecture Status:** ✅ COMPLETE  
**Last Updated:** December 8, 2025  
**Phase:** 4 - Live State API & Real-Time Integration
