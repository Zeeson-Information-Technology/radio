# Visual Guide: Online vs Offline Radio

## Quick Answer

**The system differentiates through:**
1. ✅ **Admin clicks "Go Live"** → Radio shows as ONLINE
2. ✅ **Admin clicks "Stop Live"** → Radio shows as OFFLINE
3. ✅ **Database field `isLive`** controls everything
4. ✅ **Website checks this field** and shows different UI

---

## Visual Comparison

### 🟢 WHEN ONLINE (After clicking "Go Live")

#### Admin Panel View:
```
┌────────────────────────────────────────────┐
│ Broadcast Status                           │
├────────────────────────────────────────────┤
│                                            │
│  🔴 LIVE  ← Red, animated, pulsing        │
│                                            │
│  Current Lecture:                          │
│  Tafsir of Surah Al-Baqarah               │
│                                            │
│  Lecturer:                                 │
│  Sheikh Ahmad                              │
│                                            │
│  Started: 15 minutes ago                   │
│  Listeners: 23                             │
│                                            │
│  [🛑 Stop Live] ← Red button              │
└────────────────────────────────────────────┘
```

#### Public Radio Page (`/radio`):
```
┌────────────────────────────────────────────┐
│                                            │
│  🔴 LIVE NOW  ← Animated red badge        │
│                                            │
│  Tafsir of Surah Al-Baqarah               │
│  by Sheikh Ahmad                           │
│                                            │
│  [▶ PLAY]  ← Big green button             │
│                                            │
│  Started 15 minutes ago                    │
│  23 people listening                       │
│                                            │
└────────────────────────────────────────────┘
```

#### Homepage (`/`):
```
┌────────────────────────────────────────────┐
│  🔴 LIVE NOW  ← At top of hero section    │
│                                            │
│  Al-Manhaj Radio                           │
│  إذاعة المنهج                              │
│                                            │
│  Authentic Islamic Knowledge               │
│  Following the Way of the Salaf            │
│                                            │
│  [▶ Listen Now]  ← Highlighted button     │
└────────────────────────────────────────────┘
```

---

### 🔴 WHEN OFFLINE (Default or after "Stop Live")

#### Admin Panel View:
```
┌────────────────────────────────────────────┐
│ Broadcast Status                           │
├────────────────────────────────────────────┤
│                                            │
│  ⚫ OFFLINE  ← Gray badge                  │
│                                            │
│  No active broadcast                       │
│  Fill in the details below and             │
│  click "Go Live"                           │
│                                            │
│  Lecture Title:                            │
│  [________________]                        │
│                                            │
│  Lecturer Name:                            │
│  [________________]                        │
│                                            │
│  [▶ Go Live] ← Green button               │
└────────────────────────────────────────────┘
```

#### Public Radio Page (`/radio`):
```
┌────────────────────────────────────────────┐
│                                            │
│  ⚫ OFFLINE  ← Gray badge                  │
│                                            │
│  No live broadcast at the moment           │
│                                            │
│  Check our schedule below for              │
│  upcoming lectures                         │
│                                            │
│  [▶ PLAY]  ← Grayed out or hidden        │
│                                            │
└────────────────────────────────────────────┘
```

#### Homepage (`/`):
```
┌────────────────────────────────────────────┐
│  (No LIVE badge shown)                     │
│                                            │
│  Al-Manhaj Radio                           │
│  إذاعة المنهج                              │
│                                            │
│  Authentic Islamic Knowledge               │
│  Following the Way of the Salaf            │
│                                            │
│  [Listen Now]  ← Normal button            │
└────────────────────────────────────────────┘
```

---

## Step-by-Step: How to Control

### ✅ To Make Radio ONLINE:

1. **Login to admin panel:**
   ```
   http://localhost:3000/admin/login
   Email: ibrahim.saliman.zainab@gmail.com
   Password: admin100%
   ```

2. **Go to Live Control:**
   ```
   http://localhost:3000/admin/live
   ```

3. **Fill in details:**
   - Lecture Title: "Tafsir of Surah Al-Baqarah"
   - Lecturer Name: "Sheikh Ahmad"

4. **Click "Go Live" button** (green button)

5. **Result:**
   - ✅ Database: `isLive = true`
   - ✅ Homepage shows: "🔴 LIVE NOW"
   - ✅ Radio page shows: "🔴 LIVE NOW"
   - ✅ Users can click play and hear audio

### ✅ To Make Radio OFFLINE:

1. **In admin panel** (`/admin/live`)

2. **Click "Stop Live" button** (red button)

3. **Result:**
   - ✅ Database: `isLive = false`
   - ✅ Homepage: No LIVE badge
   - ✅ Radio page shows: "⚫ OFFLINE"
   - ✅ Users see "No broadcast" message

---

## Behind the Scenes

### Database (MongoDB):

```javascript
// Collection: livestates

// When ONLINE:
{
  _id: ObjectId("..."),
  isLive: true,                              // ← KEY FIELD
  title: "Tafsir of Surah Al-Baqarah",
  lecturer: "Sheikh Ahmad",
  startedAt: ISODate("2025-12-08T10:30:00Z"),
  updatedAt: ISODate("2025-12-08T10:30:00Z")
}

// When OFFLINE:
{
  _id: ObjectId("..."),
  isLive: false,                             // ← KEY FIELD
  title: null,
  lecturer: null,
  startedAt: null,
  updatedAt: ISODate("2025-12-08T11:00:00Z")
}
```

### API Response:

```bash
# Check current status
curl http://localhost:3000/api/live

# When ONLINE:
{
  "ok": true,
  "isLive": true,
  "title": "Tafsir of Surah Al-Baqarah",
  "lecturer": "Sheikh Ahmad",
  "startedAt": "2025-12-08T10:30:00.000Z",
  "streamUrl": "http://98.93.42.61:8000/stream"
}

# When OFFLINE:
{
  "ok": true,
  "isLive": false,
  "title": null,
  "lecturer": null,
  "startedAt": null,
  "streamUrl": "http://98.93.42.61:8000/stream"
}
```

---

## Real-World Scenarios

### Scenario 1: Daily Lecture (6pm - 8pm)

**5:55 PM** - Radio is OFFLINE
- Users see: "No broadcast, check back later"
- Admin panel shows: "OFFLINE"

**6:00 PM** - Presenter arrives
- Opens admin panel
- Fills in: "Evening Tafsir Session" / "Sheikh Ahmad"
- Clicks "Go Live"

**6:01 PM** - Radio is ONLINE
- Users see: "🔴 LIVE NOW - Evening Tafsir Session"
- Can click play and listen
- Listener count starts showing

**8:00 PM** - Lecture ends
- Presenter clicks "Stop Live"

**8:01 PM** - Radio is OFFLINE
- Users see: "No broadcast, check back tomorrow"
- Admin panel shows: "OFFLINE"

### Scenario 2: Weekend Special (All Day Saturday)

**Friday 11:59 PM** - OFFLINE
- No broadcasts

**Saturday 9:00 AM** - First session
- Admin clicks "Go Live"
- Title: "Morning Hadith Study"
- Radio is ONLINE

**Saturday 11:00 AM** - Break
- Admin clicks "Stop Live"
- Radio is OFFLINE (2 hour break)

**Saturday 1:00 PM** - Second session
- Admin clicks "Go Live"
- Title: "Afternoon Q&A"
- Radio is ONLINE

**Saturday 3:00 PM** - End
- Admin clicks "Stop Live"
- Radio is OFFLINE

### Scenario 3: 24/7 Radio (With Liquidsoap)

**Setup:** Liquidsoap installed with playlist

**All the time:**
- Audio is always available (playlist playing)
- Users can always listen

**When presenter goes live:**
- Admin clicks "Go Live"
- Website shows: "🔴 LIVE NOW"
- Liquidsoap switches from playlist to live input
- Users hear live presenter

**When presenter stops:**
- Admin clicks "Stop Live"
- Website shows: "⚫ OFFLINE" (but audio still available)
- Liquidsoap switches back to playlist
- Users hear playlist again

**Note:** In this scenario, "OFFLINE" means "not live presenter" but audio is still available from playlist.

---

## Color Coding

### Status Indicators:

| Status | Badge | Color | Animation |
|--------|-------|-------|-----------|
| ONLINE | 🔴 LIVE NOW | Red | Pulsing |
| OFFLINE | ⚫ OFFLINE | Gray | Static |

### Buttons:

| Action | Button | Color | Icon |
|--------|--------|-------|------|
| Go Live | Go Live | Green | ▶ |
| Stop Live | Stop Live | Red | 🛑 |
| Play (Online) | PLAY | Green | ▶ |
| Play (Offline) | PLAY | Gray | ▶ |

---

## Automatic Updates

### How the website knows:

1. **Initial Load:**
   - Page loads
   - Fetches `/api/live`
   - Shows current status

2. **Polling (Every 30 seconds):**
   - JavaScript checks `/api/live` every 30 seconds
   - Updates UI if status changed
   - No page refresh needed

3. **Real-time Feel:**
   - User doesn't need to refresh
   - Status updates automatically
   - Smooth transitions

### Example Timeline:

```
10:00:00 - User opens /radio page
         - Sees "OFFLINE"
         
10:00:30 - Auto-check: Still offline
         
10:01:00 - Admin clicks "Go Live"
         - Database: isLive = true
         
10:01:15 - Auto-check: Now online!
         - Page updates to show "🔴 LIVE NOW"
         - User sees change without refreshing
```

---

## Summary Table

| Aspect | ONLINE | OFFLINE |
|--------|--------|---------|
| **Database** | `isLive: true` | `isLive: false` |
| **Admin Action** | Clicked "Go Live" | Clicked "Stop Live" or default |
| **Homepage Badge** | 🔴 LIVE NOW | (none) |
| **Radio Page Badge** | 🔴 LIVE NOW | ⚫ OFFLINE |
| **Lecture Info** | Shows title & lecturer | "No broadcast" |
| **Play Button** | Active, green | Grayed out |
| **Audio** | Available | Not available* |
| **Listener Count** | Shows count | Shows 0 |
| **Admin Button** | "Stop Live" (red) | "Go Live" (green) |

*Unless Liquidsoap fallback is configured

---

## Key Takeaways

1. ✅ **Simple Control:** Just click "Go Live" or "Stop Live"
2. ✅ **Clear Visual Difference:** Red badge vs gray badge
3. ✅ **Database-Driven:** One field (`isLive`) controls everything
4. ✅ **Automatic Updates:** Website checks every 30 seconds
5. ✅ **User-Friendly:** Clear messages for users
6. ✅ **Admin-Friendly:** Easy to control from admin panel

**Bottom Line:** When you want people to listen, click "Go Live". When you're done, click "Stop Live". That's it! 🎙️
