# Initial State - What It Means

## Quick Answer

**"Initial state"** = The default state of your radio when:
- App first starts
- No one has clicked "Go Live" yet
- Database is empty

**Current Initial State:** `OFFLINE` (isLive: false)

**Does it affect listening?** 
- ❌ No, users **cannot** listen when state is OFFLINE
- ✅ Yes, users **can** listen when you click "Go Live" (state becomes ONLINE)

---

## What is "Initial State"?

### Technical Definition:

When your app starts for the first time, it needs to know:
- Is the radio live or offline?
- What lecture is playing?
- Who is the lecturer?

This information is stored in MongoDB in the `livestates` collection.

### Current Initial State:

```javascript
// MongoDB: livestates collection
{
  _id: ObjectId("..."),
  isLive: false,        // ← Initial state is OFFLINE
  title: null,
  lecturer: null,
  startedAt: null
}
```

**This means:**
- Radio starts as OFFLINE
- No broadcast by default
- Users see "No live broadcast at the moment"
- Users **cannot** listen until admin clicks "Go Live"

---

## Two Approaches to Initial State

### Approach 1: Start OFFLINE (Current - Recommended) ✅

**Initial State:**
```javascript
{
  isLive: false,
  title: null,
  lecturer: null
}
```

**What Users See:**
```
┌─────────────────────────────────┐
│  ⚫ OFFLINE                      │
│                                 │
│  No live broadcast at the       │
│  moment                         │
│                                 │
│  Check our schedule for         │
│  upcoming lectures              │
└─────────────────────────────────┘
```

**Pros:**
- ✅ Clear: Users know there's no broadcast
- ✅ Intentional: Admin must explicitly go live
- ✅ No confusion: Won't show "live" when nothing is broadcasting
- ✅ Professional: Shows you control when to broadcast

**Cons:**
- ❌ Users can't listen by default
- ❌ Must manually click "Go Live" each time

**Best for:**
- Scheduled broadcasts (e.g., daily lectures at 6pm)
- When you want full control
- When broadcasts are not 24/7

---

### Approach 2: Start ONLINE (Alternative - Not Recommended)

**Initial State:**
```javascript
{
  isLive: true,
  title: "24/7 Islamic Radio",
  lecturer: "Various Scholars"
}
```

**What Users See:**
```
┌─────────────────────────────────┐
│  🔴 LIVE NOW                    │
│                                 │
│  24/7 Islamic Radio             │
│  by Various Scholars            │
│                                 │
│  [▶ PLAY]                       │
└─────────────────────────────────┘
```

**Pros:**
- ✅ Users can try to listen immediately
- ✅ Looks like radio is always on

**Cons:**
- ❌ Misleading: Shows "LIVE" even when no one is broadcasting
- ❌ Confusing: Users click play but hear nothing (if no audio)
- ❌ Unprofessional: False advertising
- ❌ Must click "Stop Live" to turn off

**Best for:**
- 24/7 radio with Liquidsoap fallback playlist
- When audio is ALWAYS available

---

## Does Initial State Affect User Listening?

### Short Answer: YES

| Initial State | Can Users Listen? | What They See |
|---------------|-------------------|---------------|
| **OFFLINE** (false) | ❌ No | "No broadcast" message |
| **ONLINE** (true) | ⚠️ Maybe | "LIVE NOW" but may have no audio |

### Detailed Explanation:

#### If Initial State is OFFLINE (Current):

1. **User visits `/radio` page**
   - Sees: "⚫ OFFLINE"
   - Message: "No live broadcast at the moment"
   - Play button: Grayed out or hidden
   - Audio: Not available

2. **Admin clicks "Go Live"**
   - State changes to ONLINE
   - Users now see: "🔴 LIVE NOW"
   - Play button: Active
   - Audio: Available ✅

3. **User can now listen!**

#### If Initial State is ONLINE:

1. **User visits `/radio` page**
   - Sees: "🔴 LIVE NOW"
   - Play button: Active
   - Clicks play...

2. **Two scenarios:**
   
   **A. If audio is streaming (Icecast has source):**
   - ✅ User hears audio
   - Everything works
   
   **B. If no audio is streaming:**
   - ❌ User hears nothing
   - Confusing experience
   - Looks broken

---

## Recommended Setup

### For Scheduled Broadcasts (Most Common):

**Initial State:** OFFLINE ✅

**Workflow:**
1. Radio starts OFFLINE
2. Before lecture, admin clicks "Go Live"
3. Users see "LIVE NOW" and can listen
4. After lecture, admin clicks "Stop Live"
5. Radio goes back to OFFLINE

**Example Timeline:**
```
5:00 PM - Radio is OFFLINE
        - Users see: "No broadcast"
        
6:00 PM - Admin clicks "Go Live"
        - Users see: "🔴 LIVE NOW"
        - Users can listen ✅
        
8:00 PM - Admin clicks "Stop Live"
        - Radio is OFFLINE again
        - Users see: "No broadcast"
```

### For 24/7 Radio (With Liquidsoap):

**Initial State:** Can be ONLINE ✅

**Setup:**
1. Install Liquidsoap (see `LIQUIDSOAP_SETUP.md`)
2. Configure fallback playlist
3. Set initial state to ONLINE
4. Audio is ALWAYS available

**Workflow:**
- Radio always shows "LIVE NOW" (or you can customize)
- Audio always available (playlist or live)
- When presenter goes live, Liquidsoap switches to live input
- When presenter stops, Liquidsoap switches back to playlist

**Note:** Even with 24/7 setup, you can still use OFFLINE initial state and only show "LIVE NOW" when presenter is actually live.

---

## How to Set Initial State

### Current Implementation:

The initial state is created automatically when:
1. App first starts
2. Someone calls `/api/live` for the first time
3. Database is empty

**Default behavior:**
```typescript
// In /api/live route
if (!liveState) {
  // Create initial state as OFFLINE
  liveState = await LiveState.create({
    isLive: false,
    title: null,
    lecturer: null,
    startedAt: null
  });
}
```

### To Change Initial State:

**Option 1: Manually in Database**

Connect to MongoDB and update:
```javascript
db.livestates.updateOne(
  {},
  {
    $set: {
      isLive: true,  // Change to true for ONLINE
      title: "24/7 Islamic Radio",
      lecturer: "Various Scholars"
    }
  }
)
```

**Option 2: Through Admin Panel**

Just click "Go Live" - this changes the state to ONLINE!

**Option 3: Create Seed Script**

Create a script to set initial state:
```javascript
// scripts/set-initial-state.js
const LiveState = require('./lib/models/LiveState');

async function setInitialState() {
  await LiveState.updateOne(
    {},
    {
      isLive: false,  // or true
      title: null,
      lecturer: null
    },
    { upsert: true }
  );
}
```

---

## Common Questions

### Q: Should I set initial state to ONLINE so users can always listen?

**A:** Only if you have 24/7 audio (Liquidsoap with playlist). Otherwise, NO.

**Why?**
- If you set it to ONLINE but have no audio, users will be confused
- They'll see "LIVE NOW" but hear nothing
- Better to show OFFLINE and only go ONLINE when you're actually broadcasting

### Q: Do I need to set initial state every time I restart the app?

**A:** No! The state is stored in MongoDB, so it persists across restarts.

**Example:**
1. You click "Go Live" → State is ONLINE
2. You restart your Next.js app
3. State is still ONLINE (stored in database)
4. Users can still see "LIVE NOW"

### Q: What happens if I forget to click "Stop Live"?

**A:** The radio will continue showing "LIVE NOW" until you click "Stop Live".

**Solution:**
- Remember to click "Stop Live" after each broadcast
- Or implement auto-timeout (not currently implemented)

### Q: Can users listen if state is OFFLINE?

**A:** Depends on your setup:

**Without Liquidsoap:**
- ❌ No, no audio available

**With Liquidsoap fallback:**
- ⚠️ Technically yes (playlist is playing)
- But website shows "OFFLINE" so users won't try
- Better to show "ONLINE" if audio is always available

---

## Best Practices

### 1. For Scheduled Broadcasts:

✅ **DO:**
- Keep initial state as OFFLINE
- Click "Go Live" before each broadcast
- Click "Stop Live" after each broadcast
- Clear communication with users

❌ **DON'T:**
- Set initial state to ONLINE without audio
- Leave state as ONLINE when not broadcasting
- Confuse users with false "LIVE" indicators

### 2. For 24/7 Radio:

✅ **DO:**
- Set up Liquidsoap with fallback playlist first
- Then set initial state to ONLINE
- Ensure audio is ALWAYS available
- Test thoroughly

❌ **DON'T:**
- Set state to ONLINE without 24/7 audio
- Promise 24/7 if you can't deliver

### 3. General:

✅ **DO:**
- Be honest with users about broadcast status
- Use "LIVE NOW" only when actually live
- Provide schedule information
- Test user experience

❌ **DON'T:**
- Mislead users with false indicators
- Leave state in wrong position
- Forget to update state

---

## Summary

### What is Initial State?
- Default state when app starts
- Stored in MongoDB
- Controls what users see

### Current Initial State:
- **OFFLINE** (isLive: false)
- Users see "No broadcast"
- Users **cannot** listen until you click "Go Live"

### Does it Affect Listening?
- **YES** - Users can only listen when state is ONLINE
- State must be ONLINE for users to hear audio
- You control this by clicking "Go Live" or "Stop Live"

### Recommended:
- ✅ Keep initial state as OFFLINE
- ✅ Click "Go Live" when you want to broadcast
- ✅ Click "Stop Live" when done
- ✅ Clear and honest with users

### Key Point:
**Initial state is just the starting point. You control the actual state by clicking "Go Live" or "Stop Live" in the admin panel. Users can only listen when the state is ONLINE (after you click "Go Live").**

---

**Bottom Line:** 
- Initial state = OFFLINE (default)
- Users can't listen until you click "Go Live"
- This is good! It prevents confusion
- You have full control over when radio is "on" or "off"

**No changes needed!** The current setup is perfect for scheduled broadcasts. 🎙️
