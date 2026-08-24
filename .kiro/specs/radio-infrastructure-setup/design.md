# Radio Infrastructure Setup & Audio File Injection - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (Vercel)                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         Radio Player (app/radio/page.tsx)           │ │
│  │  ├─ Fetches /api/live (current state)              │ │
│  │  ├─ Fetches /api/schedule (broadcasts)             │ │
│  │  └─ Connects to Icecast stream                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │    Admin Panel (app/admin/audio/page.tsx)           │ │
│  │  ├─ Audio library with injection controls           │ │
│  │  └─ Broadcast control buttons                       │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↕
         ┌──────────────────────────────────────┐
         │  Next.js Backend API (Vercel)        │
         │  ├─ /api/live                        │
         │  ├─ /api/schedule                    │
         │  ├─ /api/stream-health               │
         │  └─ /api/admin/broadcast/inject-file │
         └──────────────────────────────────────┘
                          ↕
   ┌─────────────────────────────────────────────────┐
   │  Gateway (DigitalOcean Droplet - Port 8080)    │
   │                                                 │
   │  ┌───────────────────────────────────────────┐ │
   │  │  WebSocket Handler (:8080)               │ │
   │  │  ├─ Browser audio injection              │ │
   │  │  ├─ File injection requests              │ │
   │  │  └─ Audio encoding (MP3)                 │ │
   │  └───────────────────────────────────────────┘ │
   │                                                 │
   │  ┌───────────────────────────────────────────┐ │
   │  │  Broadcast Service                        │ │
   │  │  ├─ Live state management                │ │
   │  │  ├─ File queue management                │ │
   │  │  └─ Play/pause/skip controls             │ │
   │  └───────────────────────────────────────────┘ │
   │                                                 │
   │  ┌───────────────────────────────────────────┐ │
   │  │  Icecast Bridge                           │ │
   │  │  └─ Sends MP3 stream to Icecast (:8000)  │ │
   │  └───────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────┘
                          ↕
   ┌─────────────────────────────────────────────────┐
   │  Icecast (DigitalOcean Droplet - Port 8000)    │
   │  └─ HTTP stream endpoint: /stream              │
   └─────────────────────────────────────────────────┘
                          ↕
   ┌─────────────────────────────────────────────────┐
   │  DigitalOcean Spaces (S3-compatible)           │
   │  └─ Audio file storage & retrieval             │
   └─────────────────────────────────────────────────┘
```

## Components

### 1. Gateway Server Configuration
**File:** `gateway/.env`

**Configuration Items:**
- `GATEWAY_PORT=8080` - Main gateway server port
- `ICECAST_PORT=8000` - Icecast stream server port
- `ICECAST_HOST=0.0.0.0` - Bind to all interfaces
- `ICECAST_MOUNT=/stream` - Stream mount point
- `ICECAST_PASSWORD=live-source-82736` - Source client password
- `AWS_*` - DigitalOcean Spaces credentials
- `MONGODB_URI` - Database connection
- `NEXTJS_URL` - Frontend URL for CORS

**Requirements Addressed:** 1.3, 2.1

### 2. Icecast Integration
**Files:** `gateway/server.js` (startup), Icecast config file

**Implementation:**
- Icecast runs on port 8000 on the same droplet
- Gateway connects to Icecast as a source client
- MP3 stream is sent via HTTP PUT to `http://localhost:8000/stream`
- CORS headers configured for browser access

**Requirements Addressed:** 2.1, 2.2, 2.3, 2.4

### 3. Audio File Injection API
**File:** `app/api/admin/broadcast/inject-file/route.ts` (NEW)

**Endpoint:** `POST /api/admin/broadcast/inject-file`

**Request Body:**
```typescript
{
  audioFileId: string;      // MongoDB ObjectId of audio file
  action: 'queue' | 'play'; // Play immediately or add to queue
}
```

**Response:**
```typescript
{
  ok: boolean;
  message: string;
  currentQueue: Array<{
    _id: string;
    title: string;
    lecturerName: string;
    duration: number;
  }>;
  currentlyPlaying?: {
    _id: string;
    title: string;
    lecturerName: string;
    duration: number;
    playedDuration: number;
  };
}
```

**Responsibilities:**
1. Authenticate admin user
2. Validate audio file exists and is ready for playback
3. Send file injection request to gateway
4. Update live state with new file metadata
5. Return current queue state

**Requirements Addressed:** 3.1, 3.2, 3.3

### 4. Gateway Broadcast Service Enhancement
**File:** `gateway/services/BroadcastService.js`

**New Methods:**
- `injectFile(audioFileId, action)` - Queue or play file immediately
- `skipFile()` - Skip to next file in queue
- `pauseFile()` - Pause current file
- `resumeFile()` - Resume current file
- `getQueue()` - Return current queue
- `getCurrentlyPlaying()` - Return currently playing metadata

**State Management:**
```javascript
{
  isLive: false,
  currentFile: {
    _id: string,
    title: string,
    lecturerName: string,
    duration: number,
    url: string,
    format: 'mp3'
  },
  queue: Array<audioFile>,
  playedDuration: number,
  isPaused: boolean
}
```

**Requirements Addressed:** 3.3, 3.4, 3.5

### 5. Stream Health Endpoint
**File:** `app/api/stream-health/route.ts` (existing, enhance)

**Response:**
```typescript
{
  ok: boolean;
  gatewayStatus: 'connected' | 'disconnected';
  icecastStatus: 'streaming' | 'idle' | 'error';
  activeListeners: number;
  bitrate: number; // kbps
  isLive: boolean;
  currentlyPlaying?: {
    title: string;
    lecturerName: string;
  };
  lastUpdated: ISO8601;
}
```

**Requirements Addressed:** 6.1, 6.2

### 6. Live State API Enhancement
**File:** `app/api/live/route.ts` (existing, enhance)

**Enhanced Response:**
```typescript
{
  ok: boolean;
  isLive: boolean;
  isMuted: boolean;
  streamUrl: string;
  currentlyPlaying: {
    _id: string;
    title: string;
    lecturerName: string;
    duration: number;
    playedDuration: number;
    isPaused: boolean;
  };
  queue: Array<audioFileMetadata>;
  upcomingBroadcast?: scheduleItem;
}
```

**Requirements Addressed:** 5.1, 5.2

## Data Flow

### Audio File Injection Flow
```
1. Admin selects file in admin panel
2. Front-end calls POST /api/admin/broadcast/inject-file
3. Next.js API authenticates and validates file
4. API calls gateway via HTTP/WebSocket
5. Gateway adds file to queue or plays immediately
6. Gateway streams audio through Icecast
7. Icecast sends stream to browser via HTTP
8. Browser audio element plays stream
9. Radio player UI updates with current file metadata
```

### Live State Update Flow
```
1. Radio player calls GET /api/live every 5 seconds
2. Next.js API queries gateway for current state
3. Gateway returns metadata about currently playing file
4. Front-end updates player UI with new metadata
5. Schedule display updates to show next broadcast
```

## Error Handling

### Gateway Disconnection
- If gateway unreachable, live state shows "offline"
- Radio player displays cached state
- Admin injection requests fail with clear error message
- Automatic reconnection retry every 5 seconds

### Icecast Stream Error
- If stream fails, gateway attempts automatic restart
- Listeners receive connection error, can retry
- Admin is alerted via dashboard

### File Not Ready
- If file still converting, injection is rejected
- Error message: "File is still being processed"
- Admin sees file status in library

### Queue Full
- If queue exceeds 50 items, oldest item is removed
- Warning logged, continue accepting new items

## Configuration Strategy

### Local Development (`:8080` and `:8000` on localhost)
- Gateway server runs locally
- Icecast runs locally (can be mocked with dummy stream)
- Stream URL: `http://localhost:8000/stream`

### Production (DigitalOcean Droplet)
- Gateway server runs on droplet at `<DROPLET_IP>:8080`
- Icecast runs on droplet at `<DROPLET_IP>:8000`
- Stream URL: `http://<DROPLET_IP>:8000/stream`
- CORS headers allow `https://almanhaj.vercel.app`

## Implementation Phases

### Phase 1: Gateway & Icecast Setup
1. Update `gateway/.env` with production IP
2. Verify Icecast is installed on droplet
3. Configure Icecast XML config
4. Test WebSocket connection from Next.js to gateway

### Phase 2: File Injection Endpoint
1. Create `/api/admin/broadcast/inject-file` endpoint
2. Enhance `BroadcastService` with file queue logic
3. Implement Icecast bridge for file streaming
4. Add error handling for failed injection

### Phase 3: Stream Health & Live State
1. Enhance `/api/stream-health` with comprehensive status
2. Enhance `/api/live` with queue and metadata
3. Add listener count tracking

### Phase 4: Admin UI & Radio Player
1. Add file injection UI to admin panel
2. Enhance radio player to show current file
3. Display schedule of upcoming broadcasts

## Testing Strategy

### Unit Tests
- Broadcast service queue management
- File validation logic
- State update correctness

### Integration Tests
- End-to-end file injection flow
- Gateway ↔ Icecast communication
- Next.js API ↔ Gateway communication

### Manual Testing
- Stream playback in browser
- File injection via admin panel
- File queue progression
- Pause/resume/skip controls

## Correctness Properties

### Property 1: File Queue Integrity
For all file injections, the injected file must appear in the queue or be immediately playing.

### Property 2: Stream Continuity
The Icecast stream must not have gaps longer than 100ms between file transitions.

### Property 3: Metadata Accuracy
The metadata returned by `/api/live` must match the currently playing file in Icecast.

### Property 4: Queue Ordering
Files in the queue must play in FIFO order (first queued, first played).

### Property 5: File Status Validation
Only files with `conversionStatus: 'ready'` can be injected into the stream.

## Security Considerations

- File injection endpoint requires admin authentication
- Queue can only be modified by authenticated admins
- Gateway communication is internal (droplet network)
- Icecast source password protects stream source
- Stream endpoint is read-only (listeners only)
