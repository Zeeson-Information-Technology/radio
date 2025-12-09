# Online vs Offline Radio - How It Works

## Current System

Al-Manhaj Radio has a **manual control system** where admins/presenters decide when the radio is "live" or "offline".

## How It Works

### 🟢 ONLINE (Live Broadcasting)

**When:** Admin clicks "Go Live" button in admin panel

**What Happens:**
1. Database updates: `isLive: true`
2. Stores lecture title and lecturer name
3. Records start time
4. Website shows "🔴 LIVE NOW" everywhere
5. Users can click play and hear audio

**Admin Control:**
- Login to `/admin/live`
- Fill in lecture title (e.g., "Tafsir of Surah Al-Baqarah")
- Fill in lecturer name (e.g., "Sheikh Ahmad")
- Click **"Go Live"** button
- Radio is now ONLINE ✅

### 🔴 OFFLINE (Not Broadcasting)

**When:** Admin clicks "Stop Live" button OR no one has clicked "Go Live"

**What Happens:**
1. Database updates: `isLive: false`
2. Clears lecture info
3. Website shows "OFFLINE" status
4. Play button may show but won't have audio (unless you have fallback playlist)

**Admin Control:**
- Click **"Stop Live"** button in admin panel
- Radio is now OFFLINE ✅

## Visual Differences for Users

### When ONLINE (Live):

**Radio Page (`/radio`):**
```
┌─────────────────────────────────────┐
│  🔴 LIVE NOW (animated, pulsing)    │
│                                     │
│  Tafsir of Surah Al-Baqarah        │
│  by Sheikh Ahmad                    │
│                                     │
│  [▶ PLAY]  (active, clickable)     │
│                                     │
│  Started: 15 minutes ago            │
│  Listeners: 23                      │
└─────────────────────────────────────┘
```

**Homepage (`/`):**
```
┌─────────────────────────────────────┐
│  🔴 LIVE NOW                        │
│                                     │
│  Al-Manhaj Radio                    │
│  إذاعة المنهج                       │
│                                     │
│  [Listen Now] (highlighted)         │
└─────────────────────────────────────┘
```

### When OFFLINE:

**Radio Page (`/radio`):**
```
┌─────────────────────────────────────┐
│  ⚫ OFFLINE                          │
│                                     │
│  No live broadcast at the moment    │
│                                     │
│  Check back later for live lectures │
│                                     │
│  [▶ PLAY]  (grayed out or hidden)  │
└─────────────────────────────────────┘
```

**Homepage (`/`):**
```
┌─────────────────────────────────────┐
│  (No LIVE badge)                    │
│                                     │
│  Al-Manhaj Radio                    │
│  إذاعة المنهج                       │
│                                     │
│  [Listen Now] (normal style)        │
└─────────────────────────────────────┘
```

## Database State

### Live State Model (MongoDB):

```javascript
{
  _id: ObjectId("..."),
  isLive: true,              // ← This determines online/offline
  title: "Tafsir of Surah Al-Baqarah",
  lecturer: "Sheikh Ahmad",
  startedAt: "2025-12-08T10:30:00.000Z",
  updatedAt: "2025-12-08T10:30:00.000Z"
}
```

**Key Field:** `isLive`
- `true` = Radio is ONLINE
- `false` = Radio is OFFLINE

## API Endpoint

### GET `/api/live`

**When Online:**
```json
{
  "ok": true,
  "isLive": true,
  "title": "Tafsir of Surah Al-Baqarah",
  "lecturer": "Sheikh Ahmad",
  "startedAt": "2025-12-08T10:30:00.000Z"
}
```

**When Offline:**
```json
{
  "ok": true,
  "isLive": false,
  "title": null,
  "lecturer": null,
  "startedAt": null
}
```

## Three Scenarios Explained

### Scenario 1: Scheduled Lecture (Most Common)

**Timeline:**
1. **Before lecture:** Radio is OFFLINE
2. **Presenter arrives:** Opens admin panel
3. **Presenter clicks "Go Live":** Radio becomes ONLINE
4. **Lecture happens:** Users listen
5. **Lecture ends:** Presenter clicks "Stop Live"
6. **After lecture:** Radio is OFFLINE again

**User Experience:**
- Before: "No broadcast, check back later"
- During: "🔴 LIVE NOW - Tafsir lecture"
- After: "No broadcast, check back later"

### Scenario 2: 24/7 Radio (With Fallback Playlist)

**Setup:** Install Liquidsoap (see `LIQUIDSOAP_SETUP.md`)

**How it works:**
1. **No presenter:** Liquidsoap plays music/lectures from playlist
2. **Presenter goes live:** Liquidsoap switches to live input
3. **Presenter stops:** Liquidsoap switches back to playlist

**User Experience:**
- Always has audio playing
- Admin panel shows "LIVE" only when presenter is broadcasting
- Users always hear something (playlist or live)

**Database State:**
- `isLive: true` = Presenter is live
- `isLive: false` = Playing from playlist (but audio still available)

### Scenario 3: Scheduled Breaks (No Broadcasting)

**Example:** Radio only broadcasts 6pm-10pm daily

**Timeline:**
- **6:00 PM:** Admin clicks "Go Live" → ONLINE
- **10:00 PM:** Admin clicks "Stop Live" → OFFLINE
- **10:01 PM - 5:59 PM next day:** OFFLINE (no audio)

**User Experience:**
- During broadcast hours: Can listen
- Outside broadcast hours: "Check back at 6pm"

## Admin Control Flow

### Starting Broadcast:

```
Admin Panel (/admin/live)
    ↓
Fill in title: "Tafsir Lecture"
Fill in lecturer: "Sheikh Ahmad"
    ↓
Click "Go Live" button
    ↓
POST /api/admin/live/start
    ↓
Database: isLive = true
    ↓
Website updates automatically
    ↓
Users see "🔴 LIVE NOW"
```

### Stopping Broadcast:

```
Admin Panel (/admin/live)
    ↓
Click "Stop Live" button
    ↓
POST /api/admin/live/stop
    ↓
Database: isLive = false
    ↓
Website updates automatically
    ↓
Users see "OFFLINE"
```

## Automatic vs Manual Control

### Current System: MANUAL ✅

**Pros:**
- ✅ Full control over when radio shows as "live"
- ✅ Can set lecture title and lecturer
- ✅ Clear start/stop times
- ✅ Simple to understand

**Cons:**
- ❌ Must manually click "Go Live" and "Stop Live"
- ❌ If presenter forgets to stop, shows as live forever
- ❌ No automatic detection

### Possible: AUTOMATIC (Not Implemented)

**How it would work:**
- Detect if audio is streaming to Icecast
- Automatically set `isLive: true` when stream detected
- Automatically set `isLive: false` when stream stops

**Pros:**
- ✅ No manual control needed
- ✅ Always accurate

**Cons:**
- ❌ Can't set lecture title/lecturer automatically
- ❌ More complex
- ❌ May show "live" during testing

## Best Practices

### For Scheduled Broadcasts:

1. **Before lecture:**
   - Login to admin panel
   - Prepare title and lecturer name
   - Connect Rocket Broadcaster
   - Click "Go Live"

2. **During lecture:**
   - Monitor listener count
   - Check if audio is working

3. **After lecture:**
   - Click "Stop Live"
   - Disconnect Rocket Broadcaster

### For 24/7 Radio:

1. **Setup Liquidsoap** (one-time)
   - Follow `LIQUIDSOAP_SETUP.md`
   - Upload playlist files
   - Configure fallback

2. **When going live:**
   - Click "Go Live" in admin panel
   - Connect Rocket Broadcaster
   - Liquidsoap automatically switches to your live input

3. **When stopping:**
   - Click "Stop Live"
   - Disconnect Rocket Broadcaster
   - Liquidsoap automatically switches back to playlist

## User Notifications (Future Enhancement)

**Not implemented yet, but possible:**

### Email Notifications:
- Send email when radio goes live
- "Sheikh Ahmad is now live with Tafsir lecture"

### Push Notifications:
- Browser push notifications
- Mobile app notifications

### Social Media:
- Auto-post to Twitter/Facebook when live
- "We're live now! Join us at radio.almanhaj.com"

### Schedule Display:
- Show upcoming lectures
- "Next live: Tomorrow at 6pm"

## Technical Implementation

### Frontend (React):

```typescript
// Fetch live state
const [isLive, setIsLive] = useState(false);

useEffect(() => {
  fetch('/api/live')
    .then(res => res.json())
    .then(data => setIsLive(data.isLive));
}, []);

// Show different UI based on state
{isLive ? (
  <div>🔴 LIVE NOW</div>
) : (
  <div>⚫ OFFLINE</div>
)}
```

### Backend (API):

```typescript
// Start live
POST /api/admin/live/start
{
  title: "Tafsir Lecture",
  lecturer: "Sheikh Ahmad"
}
→ Sets isLive = true in database

// Stop live
POST /api/admin/live/stop
→ Sets isLive = false in database

// Check status
GET /api/live
→ Returns current isLive state
```

## Summary

### How to Control:

| Action | How | Result |
|--------|-----|--------|
| Go Online | Click "Go Live" in admin panel | Users see "🔴 LIVE NOW" |
| Go Offline | Click "Stop Live" in admin panel | Users see "OFFLINE" |
| Check Status | Visit `/api/live` | See current state |

### What Users See:

| State | Badge | Audio | Message |
|-------|-------|-------|---------|
| Online | 🔴 LIVE NOW | ✅ Available | Lecture title + lecturer |
| Offline | ⚫ OFFLINE | ❌ Not available* | "Check back later" |

*Unless you have Liquidsoap fallback playlist

### Key Points:

1. ✅ **Manual control** - Admin decides when live
2. ✅ **Database-driven** - `isLive` field controls everything
3. ✅ **Real-time updates** - Website checks every few seconds
4. ✅ **Simple workflow** - Just click "Go Live" or "Stop Live"
5. ✅ **Flexible** - Works for scheduled or 24/7 broadcasting

---

**Need automatic detection?** Let me know and I can implement it!

**Want 24/7 audio?** Follow `LIQUIDSOAP_SETUP.md` for fallback playlist.

**Questions?** The system is designed to be simple - just click "Go Live" when you want to broadcast! 🎙️
