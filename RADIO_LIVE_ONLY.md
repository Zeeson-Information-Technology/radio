# Radio Page: Live Streaming Only

## Core Principle
**The radio page is ONLY for live broadcasts. No recordings. No 24/7 content.**

## How It Works

### When LIVE ✅
- Shows "LIVE NOW" badge with pulsing animation
- Play button is VISIBLE and functional
- Users can click to listen to the live stream
- Shows current lecture title and lecturer
- Displays "Started X minutes ago"
- Message: "You are listening to a live broadcast"

### When OFFLINE ❌
- Shows welcoming "As-salamu alaykum!" message
- Play button is HIDDEN (not available)
- Shows gray radio icon instead
- Message: "No Live Broadcast"
- Explains: "We're currently offline"
- Tells users when to return for next live program
- Clear statement: "The radio stream is only available during live broadcasts"

## Why This Approach?

### Clarity
- Users immediately understand if they can listen or not
- No confusion about what the play button does
- No misleading "24/7 streaming" messages

### Honesty
- We don't pretend to have content when we don't
- We're transparent about being between programs
- We guide users on when to return

### Simplicity
- One purpose: live radio streaming
- No mixing of live and recorded content
- Clean, focused user experience

## Future: Recordings (v2)
Recordings will be handled separately:
- Different page/section
- Different UI/UX
- Clear distinction from live radio
- Will not be mixed with live streaming

## User Flow

```
User visits /radio
    ↓
Is radio live?
    ↓
YES → Show play button → User can listen
    ↓
NO → Hide play button → Show schedule → Tell when to return
```

## Benefits

### For Users
- ✅ No confusion about what's available
- ✅ Clear expectations
- ✅ Know exactly when to return
- ✅ Not disappointed by misleading UI

### For Radio Station
- ✅ Professional, honest approach
- ✅ Builds trust with audience
- ✅ Reduces support questions
- ✅ Clear distinction between live and recorded content

## Implementation Details

### Play Button Logic
```typescript
{liveData.isLive ? (
  // Show play button
  <button onClick={handlePlayPause}>...</button>
) : (
  // Show offline message, no button
  <div>No Live Broadcast</div>
)}
```

### Audio Element
- Only plays when `liveData.isLive === true`
- Stream URL only loaded when live
- No audio element rendered when offline

### Messages
- **Live**: "Click to Listen Live", "Now Playing Live"
- **Offline**: "No Live Broadcast", "Join us live at [time]"

## Testing

### Test Case 1: Visit When Live
1. Go to /radio page
2. Verify "LIVE NOW" badge shows
3. Verify play button is visible
4. Click play button
5. Verify audio plays
6. Verify "Now Playing Live" message

### Test Case 2: Visit When Offline
1. Go to /radio page
2. Verify welcoming message shows
3. Verify NO play button (should be hidden)
4. Verify gray radio icon shows
5. Verify "No Live Broadcast" message
6. Verify next program info shows
7. Verify "only available during live broadcasts" message

### Test Case 3: Transition from Live to Offline
1. Be on page while live
2. Admin stops broadcast
3. Wait 30 seconds (auto-refresh)
4. Verify play button disappears
5. Verify offline message appears
6. Verify audio stops if playing

---

**Status**: ✅ Implemented  
**Version**: v1  
**Date**: December 9, 2024
