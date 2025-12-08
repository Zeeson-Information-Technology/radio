# Phase 4 Complete - Live State API & Real-Time Integration

## What Was Built

Phase 4 of the Islamic Online Radio project has been successfully completed. This phase focused on implementing real-time live state management, connecting the public radio page to live data, and creating functional admin controls for managing live streams.

## Key Features Implemented

✅ **Live State Management API**
- Public endpoint to get current live status
- Admin endpoints to start/stop live streams
- Real-time status updates

✅ **Real-Time Radio Page**
- Fetches live data from API on server-side
- Auto-refreshes every 30 seconds on client-side
- Shows live/offline status with proper badges
- Displays current title, lecturer, and start time

✅ **Functional Admin Controls**
- Real live stream start/stop functionality
- Form to set title and lecturer
- Current status display with timing
- Success/error message handling

✅ **Stream URL Configuration**
- Centralized stream URL management
- Environment variable support with fallbacks
- Development debugging features

## Project Structure Updates

```
online-radio/
├── app/
│   ├── api/
│   │   ├── live/                        # Public live state API
│   │   │   └── route.ts                 # GET /api/live
│   │   └── admin/
│   │       └── live/                    # Admin live control APIs
│   │           ├── start/
│   │           │   └── route.ts         # POST /api/admin/live/start
│   │           └── stop/
│   │               └── route.ts         # POST /api/admin/live/stop (NEW)
│   ├── radio/
│   │   ├── page.tsx                     # Updated with real data fetching
│   │   └── RadioPlayer.tsx              # New client component
│   └── admin/
│       └── live/
│           ├── page.tsx                 # Protected server component
│           └── LiveControlPanel.tsx     # Updated with real functionality
├── lib/
│   └── config.ts                        # Updated with getStreamUrl helper
└── PHASE4_COMPLETE.md                   # This documentation
```

## API Endpoints

### GET /api/live (Public)

**Purpose:** Get current live state for public radio page

**Authentication:** None required (public endpoint)

**Response:**
```json
{
  "ok": true,
  "isLive": false,
  "title": "Offline",
  "lecturer": null,
  "startedAt": null,
  "streamUrl": "https://example.com/stream"
}
```

**Behavior:**
- Connects to MongoDB and finds the single LiveState document
- If no LiveState exists, creates a default offline state
- Returns stream URL from `STREAM_URL` environment variable
- Falls back to `"https://example.com/stream"` if env var not set
- Always returns a valid response, even on database errors

### POST /api/admin/live/start (Protected)

**Purpose:** Start a live stream session

**Authentication:** Required (admin or presenter)

**Request Body:**
```json
{
  "title": "Tafsir of Surah Al-Baqarah",
  "lecturer": "Sheikh Ahmad"
}
```

**Response:**
```json
{
  "ok": true,
  "isLive": true,
  "message": "Live stream started successfully",
  "liveState": {
    "isLive": true,
    "title": "Tafsir of Surah Al-Baqarah",
    "lecturer": "Sheikh Ahmad",
    "startedAt": "2025-12-08T03:30:00.000Z",
    "mount": "/stream"
  }
}
```

**Behavior:**
- Authenticates user via JWT cookie
- Allows both "admin" and "presenter" roles
- Updates LiveState document:
  - `isLive: true`
  - `title`: from request or "Live Session"
  - `lecturer`: from request or user's email
  - `startedAt`: current timestamp
  - `mount`: keeps existing or sets "/stream"

### POST /api/admin/live/stop (Protected)

**Purpose:** Stop the current live stream

**Authentication:** Required (admin or presenter)

**Request Body:** None required

**Response:**
```json
{
  "ok": true,
  "isLive": false,
  "message": "Live stream stopped successfully",
  "liveState": {
    "isLive": false,
    "title": "Offline",
    "lecturer": "Sheikh Ahmad",
    "startedAt": null,
    "mount": "/stream"
  }
}
```

**Behavior:**
- Authenticates user via JWT cookie
- Updates LiveState document:
  - `isLive: false`
  - `startedAt: null`
  - Keeps existing title and lecturer

## Public Radio Page (/radio)

### Server-Side Data Fetching

The radio page now fetches real live data on the server:

```typescript
// app/radio/page.tsx
export default async function RadioPage() {
  const response = await fetch(`${baseUrl}/api/live`, {
    cache: 'no-store', // Always fetch fresh data
  });
  
  const liveData = await response.json();
  return <RadioPlayer initialData={liveData} />;
}
```

**Features:**
- Server-side rendering with fresh data on each page load
- Fallback data if API fails
- Passes initial data to client component

### Client-Side Component (RadioPlayer)

**Features:**
- Receives initial data from server
- Auto-polls `/api/live` every 30 seconds for updates
- Shows live/offline badge with animation
- Displays title, lecturer, and "started X minutes ago"
- Audio player with play/pause controls
- Uses real stream URL from API
- Development mode shows stream URL for debugging

**Live Status Display:**
- 🔴 "LIVE NOW" badge (red, animated) when `isLive: true`
- ⚪ "OFFLINE - Playing Recordings" badge when `isLive: false`

**Time Display:**
- "Started X minutes ago" for sessions < 1 hour
- "Started X hours ago" for longer sessions

## Admin Live Control Panel (/admin/live)

### Server-Side Protection

```typescript
// app/admin/live/page.tsx
export default async function AdminLivePage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return <LiveControlPanel admin={admin} />;
}
```

**Features:**
- Protected by authentication (Phase 3)
- Redirects to login if not authenticated
- Passes admin user data to client component

### Client-Side Component (LiveControlPanel)

**Features:**
- Fetches current live state on mount
- Real-time status display:
  - Live/Offline badge
  - Current title and lecturer
  - Time since started
- Form inputs:
  - Lecture title (text input)
  - Lecturer name (defaults to user's email)
- Action buttons:
  - "Go Live" - calls `/api/admin/live/start`
  - "Stop Live" - calls `/api/admin/live/stop`
  - Buttons disabled during loading
  - Only show relevant button based on current state
- Success/error messages
- Quick actions:
  - "View Public Radio Page" - opens `/radio` in new tab
  - "Refresh Status" - manually refresh live state
- Navigation:
  - "Manage Users" (admin only)
  - "Change Password"
  - "Logout"

**User Experience:**
1. Admin logs in and sees current live status
2. Fills in title and lecturer name
3. Clicks "Go Live"
4. Status updates immediately
5. Public radio page shows live badge and metadata
6. Admin can click "Stop Live" to end session

## Configuration Helper

### getStreamUrl() Function

Added to `lib/config.ts`:

```typescript
export function getStreamUrl(): string {
  return config.streamUrl || "https://example.com/stream";
}
```

**Purpose:**
- Centralized stream URL access
- Provides fallback if `STREAM_URL` env var not set
- Can be used throughout the application

**Usage:**
```typescript
import { getStreamUrl } from "@/lib/config";

const streamUrl = getStreamUrl();
```

## Environment Variables

### Required for Phase 4

Add to `.env.local`:

```env
# Streaming Server URL (public-facing)
STREAM_URL=https://your-stream-server.com/stream
```

**Notes:**
- If not set, falls back to `"https://example.com/stream"`
- This is the URL that will be used in the `<audio>` element
- Should point to your actual Icecast/streaming server (Phase 5)

### Existing Variables (from previous phases)

```env
# MongoDB (Phase 2)
MONGODB_URI=mongodb+srv://...

# Authentication (Phase 3)
JWT_SECRET=your-secret-key

# Super Admin (Phase 3)
SUPER_ADMIN_PASSWORD=your-password

# Streaming Server Details (Phase 5 - not used yet)
STREAM_HOST=your-server.com
STREAM_PORT=8000
STREAM_MOUNT=/stream
STREAM_PASSWORD=source-password
```

## Testing Phase 4

### Prerequisites

1. MongoDB connected (Phase 2)
2. Super admin created (Phase 3)
3. Development server running: `npm run dev`

### Test 1: Public Radio Page

1. Visit http://localhost:3000/radio
2. Should see:
   - "OFFLINE - Playing Recordings" badge
   - Title: "Offline" or last session title
   - Audio player with play button
   - Stream URL in dev mode

### Test 2: Start Live Stream

1. Log in as admin at http://localhost:3000/admin/login
2. Navigate to http://localhost:3000/admin/live
3. Should see:
   - Current status: "OFFLINE"
   - Form inputs for title and lecturer
   - "Go Live" button
4. Fill in:
   - Title: "Tafsir of Surah Al-Baqarah"
   - Lecturer: "Sheikh Ahmad"
5. Click "Go Live"
6. Should see:
   - Success message: "Live stream started successfully!"
   - Status changes to "LIVE" with red badge
   - Shows title, lecturer, and "Just started"

### Test 3: Verify Public Page Updates

1. Open http://localhost:3000/radio in another tab
2. Should see:
   - "LIVE NOW" badge (red, animated)
   - Title: "Tafsir of Surah Al-Baqarah"
   - Lecturer: "by Sheikh Ahmad"
   - "Started X minutes ago"
3. Wait 30 seconds - status should auto-refresh

### Test 4: Stop Live Stream

1. Go back to admin panel
2. Click "Stop Live"
3. Should see:
   - Success message: "Live stream stopped successfully!"
   - Status changes to "OFFLINE"
   - "Go Live" button appears again
4. Check public radio page - should show offline status

### Test 5: API Testing with curl

**Get live state:**
```bash
curl http://localhost:3000/api/live
```

**Start live (requires auth):**
```bash
# First login to get cookie
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ibrahim.saliman.zainab@gmail.com","password":"your-password"}' \
  -c cookies.txt

# Then start live
curl -X POST http://localhost:3000/api/admin/live/start \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Lecture","lecturer":"Test Sheikh"}' \
  -b cookies.txt
```

**Stop live:**
```bash
curl -X POST http://localhost:3000/api/admin/live/stop \
  -b cookies.txt
```

## What's Working Now

✅ **Live State Management**
- Database-backed live state
- Single source of truth (one LiveState document)
- Real-time updates

✅ **Public Radio Page**
- Server-side rendering with fresh data
- Client-side polling every 30 seconds
- Live/offline status display
- Title and lecturer metadata
- Audio player with stream URL

✅ **Admin Controls**
- Start/stop live streams
- Set title and lecturer
- View current status
- Success/error feedback
- Role-based access (admin & presenter)

✅ **Integration**
- All components connected to real APIs
- No more placeholder data
- Consistent state across all pages

## What's NOT Working Yet (Coming in Phase 5)

❌ **Actual Streaming**
- No Icecast server setup
- Stream URL is placeholder
- Audio won't play until real stream configured

❌ **Streaming Server Integration**
- No connection to Icecast
- No source password authentication
- No mount point configuration

❌ **Advanced Features**
- No scheduled streams
- No episode recording
- No listener statistics
- No chat or comments

## Technical Implementation Details

### LiveState Singleton Pattern

The application uses a singleton pattern for LiveState:
- Only one LiveState document exists in the database
- Created automatically if missing
- All operations find or create this single document

```typescript
let liveState = await LiveState.findOne();
if (!liveState) {
  liveState = await LiveState.create({
    isLive: false,
    mount: "/stream",
    title: "Offline",
    lecturer: "",
    startedAt: null,
  });
}
```

### Server-Side Rendering + Client-Side Updates

**Hybrid approach:**
1. Server fetches initial data (fast first load)
2. Client receives initial data as props
3. Client polls for updates every 30 seconds
4. Best of both worlds: SEO + real-time updates

### Error Handling

**API endpoints:**
- Always return valid JSON
- Provide fallback data on errors
- Log errors to console
- Return appropriate HTTP status codes

**Client components:**
- Catch fetch errors
- Show user-friendly error messages
- Graceful degradation

### Authentication Flow

**Protected endpoints:**
1. Check for `admin_token` cookie
2. Verify JWT token
3. Fetch user from database
4. Check user role (admin or presenter)
5. Process request or return 401/403

## File Changes Summary

**New Files:**
- `app/api/admin/live/stop/route.ts` - Stop live stream endpoint
- `app/radio/RadioPlayer.tsx` - Client component for radio player
- `PHASE4_COMPLETE.md` - This documentation

**Modified Files:**
- `lib/config.ts` - Added `getStreamUrl()` helper
- `app/api/live/route.ts` - Already existed from context transfer
- `app/api/admin/live/start/route.ts` - Already existed from context transfer
- `app/radio/page.tsx` - Updated to fetch real data
- `app/admin/live/LiveControlPanel.tsx` - Updated with real API calls

## Security Considerations

✅ **Authentication Required**
- Start/stop endpoints require valid JWT
- Only admin and presenter roles allowed
- Token verified on every request

✅ **Public Endpoint Safety**
- `/api/live` is public (read-only)
- No sensitive data exposed
- Graceful error handling

✅ **Input Validation**
- Title and lecturer sanitized
- Fallback values provided
- No SQL injection risk (using Mongoose)

## Performance Considerations

✅ **Efficient Polling**
- 30-second interval (not too aggressive)
- Only polls when page is active
- Cleanup on component unmount

✅ **Server-Side Caching**
- `cache: 'no-store'` for fresh data
- Could add short cache in production (5-10 seconds)

✅ **Database Queries**
- Single document queries (fast)
- Indexed by default (_id)
- Minimal data transfer

## Next Steps (Phase 5)

Phase 5 will implement:
1. Icecast server setup and configuration
2. Streaming server integration
3. Source authentication
4. Mount point management
5. Actual audio streaming
6. Testing with real streaming software (OBS, Butt, etc.)

## Troubleshooting

### "Service Unavailable" on /radio

**Problem:** Radio page shows "Service Unavailable"

**Solution:**
- Check MongoDB connection
- Verify `MONGODB_URI` in `.env.local`
- Check server logs for errors
- Try accessing `/api/live` directly

### Live state not updating

**Problem:** Changes in admin panel don't reflect on radio page

**Solution:**
- Wait 30 seconds for auto-refresh
- Manually refresh the page
- Check browser console for errors
- Verify API endpoints are working

### "Not authenticated" error

**Problem:** Can't start/stop live stream

**Solution:**
- Make sure you're logged in
- Check for `admin_token` cookie in DevTools
- Try logging out and back in
- Verify JWT_SECRET is set

### Audio player not working

**Problem:** Audio doesn't play

**Solution:**
- This is expected in Phase 4
- `STREAM_URL` is placeholder
- Real streaming will work in Phase 5
- Check browser console for audio errors

## Summary

Phase 4 successfully implements a complete live state management system with real-time updates. The public radio page now displays actual live status from the database, and admins/presenters can control live streams through a functional admin panel. All components are connected to real APIs, and the system is ready for actual streaming server integration in Phase 5.

The application now has:
- ✅ Full authentication system (Phase 3)
- ✅ Live state management (Phase 4)
- ✅ Real-time status updates (Phase 4)
- ✅ Admin controls (Phase 4)
- ✅ Public radio page (Phase 4)

Next up: Icecast server setup and actual audio streaming! 🎙️

