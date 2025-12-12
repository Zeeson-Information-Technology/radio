# State Management & Error Handling Review

## 🌍 Global State Management

### LiveState Model (Single Document)
```typescript
// lib/models/LiveState.ts
{
  isLive: boolean,           // Is broadcast currently live?
  isPaused: boolean,         // Is broadcast paused?
  mount: string,             // Icecast mount point (/stream)
  lecturer: string,          // Current presenter name
  title: string,             // Broadcast title
  startedAt: Date,           // When broadcast started
  pausedAt: Date,            // When broadcast was paused
  updatedAt: Date            // Last update timestamp
}
```

### ✅ Global Across All Users
- **Single MongoDB document** - Only ONE LiveState exists
- **All admins see same state** - If Admin A starts broadcast, Admin B sees it
- **All listeners see same state** - Real-time sync via Server-Sent Events
- **No per-user state** - State is global, not per-user

### State Flow
```
Admin Starts Broadcast
    ↓
Gateway updates MongoDB: isLive = true
    ↓
/api/live returns: { isLive: true, ... }
    ↓
/api/live/events broadcasts update to all listeners
    ↓
All listeners' UIs update instantly
```

---

## 🚨 Error Messages & Handling

### Error Types & Messages

#### 1. **Browser Support Error**
```
Message: "Your browser does not support audio streaming. Please use Chrome, Firefox, or Safari."
When: On component mount if browser lacks getUserMedia, WebSocket, or AudioContext
Severity: FATAL - User can't broadcast
Action: User must use supported browser
```

#### 2. **Existing Session Error**
```
Message: "You have an active broadcast session. Click 'Reconnect to Resume' to continue your broadcast."
When: Admin reloads page while broadcast is live
Severity: INFO - Session detected, can resume
Action: Click "Reconnect to Resume" button
```

#### 3. **Another User Broadcasting**
```
Message: "{lecturer_name} is currently live. Please wait for them to finish."
When: Admin tries to start broadcast while another admin is already broadcasting
Severity: BLOCKING - Can't start new broadcast
Action: Wait for other admin to stop, then try again
```

#### 4. **Authentication Failed**
```
Message: "Authentication failed. Please refresh and try again."
When: Failed to get JWT token from /api/admin/live/broadcast-token
Severity: FATAL - Can't start broadcast
Action: Refresh page and try again
```

#### 5. **Connection Timeout**
```
Message: "Failed to connect to broadcast server"
When: WebSocket connection to gateway takes >10 seconds
Severity: FATAL - Can't establish connection
Action: Check internet, try again
```

#### 6. **WebSocket Connection Error**
```
Message: "Failed to connect to broadcast server"
When: WebSocket connection fails (gateway down, network issue)
Severity: FATAL - Can't broadcast
Action: Check gateway status, try again
```

#### 7. **Connection Lost During Stream**
```
Message: "Connection lost during stream"
When: WebSocket closes while streaming
Severity: CRITICAL - Stream interrupted
Action: Reconnect to resume
```

#### 8. **Stream Error (Transient)**
```
Message: (Not shown to user)
When: FFmpeg encoding error, audio processing error
Severity: WARNING - Stream may recover
Action: None - system tries to recover automatically
```

#### 9. **Stream Error (Fatal)**
```
Message: (From gateway, e.g., "Icecast connection failed")
When: Can't connect to Icecast, encoding failed
Severity: FATAL - Stream stopped
Action: Check Icecast status, try again
```

#### 10. **Audio Processing Error**
```
Message: (Not shown to user)
When: Invalid audio data, NaN samples
Severity: WARNING - Occasional glitches
Action: None - filtered automatically
```

#### 11. **Microphone Permission Denied**
```
Message: "Could not access microphone. Please check permissions."
When: User denies microphone access
Severity: FATAL - Can't capture audio
Action: Allow microphone in browser settings
```

---

## 📊 Error Handling Strategy

### Smart Error Classification

#### Transient Errors (Don't Stop Stream)
```typescript
if (connectionState === 'streaming') {
  // Transient error - log but don't change state
  console.warn('⚠️ Transient stream error:', data.message);
  // Stream continues working
}
```
- Audio processing warnings
- Occasional encoding glitches
- Temporary network hiccups

#### Fatal Errors (Stop Stream)
```typescript
else {
  // Fatal error - change state and show to user
  setConnectionState('error');
  setErrorMessage(data.message);
  onError?.(data.message);
}
```
- Connection lost
- Authentication failed
- Icecast unreachable
- Microphone denied

### Error Message Clearing

**Errors clear automatically when:**
- ✅ Stream starts successfully → `setErrorMessage('')`
- ✅ Stream pauses successfully → `setErrorMessage('')`
- ✅ Stream resumes successfully → `setErrorMessage('')`
- ✅ User clicks "Try Again" → New attempt clears old error

**Errors persist when:**
- ❌ Browser not supported
- ❌ Another user broadcasting
- ❌ Connection lost (until reconnect)

---

## 🔄 State Consistency Across Users

### Scenario 1: Admin A Starts, Admin B Checks

```
Time 1: Admin A clicks "Start Broadcasting"
  ↓
  Gateway updates MongoDB: isLive = true, lecturer = "Admin A"
  ↓
  /api/live returns: { isLive: true, lecturer: "Admin A" }

Time 2: Admin B opens /admin/live
  ↓
  BrowserEncoder calls GET /api/live
  ↓
  Gets: { isLive: true, lecturer: "Admin A" }
  ↓
  Shows error: "Admin A is currently live. Please wait..."
  ↓
  Admin B can't start broadcast ✅ CORRECT
```

### Scenario 2: Admin A Reloads, Admin B Still Listening

```
Time 1: Admin A reloads page during broadcast
  ↓
  BrowserEncoder detects: isLive = true, isPaused = false
  ↓
  Auto-pauses: isPaused = true
  ↓
  Gateway updates MongoDB

Time 2: Listeners receive SSE update
  ↓
  { type: 'broadcast_update', isPaused: true }
  ↓
  Listeners see "PAUSED" status ✅ CORRECT
  ↓
  Admin A clicks "Resume"
  ↓
  isPaused = false
  ↓
  Listeners see "LIVE" again ✅ CORRECT
```

### Scenario 3: Multiple Listeners, One Broadcast

```
Listener A, B, C all connected to /api/live/events

Admin starts broadcast
  ↓
  Gateway calls POST /api/live/notify
  ↓
  broadcastLiveUpdate() sends to all connections
  ↓
  Listener A, B, C all receive update simultaneously ✅ CORRECT
```

---

## 🎯 Error Message Flow

### Admin Broadcasting Error Flow

```
Admin clicks "Start Broadcasting"
    ↓
[Try to get JWT token]
    ├─ Success → Continue
    └─ Fail → Show "Authentication failed. Please refresh..."
    ↓
[Try to connect WebSocket]
    ├─ Success → Continue
    ├─ Timeout → Show "Failed to connect to broadcast server"
    └─ Error → Show "Failed to connect to broadcast server"
    ↓
[Try to get microphone]
    ├─ Success → Continue
    └─ Denied → Show "Could not access microphone..."
    ↓
[Check existing session]
    ├─ No session → Start new broadcast
    ├─ Own session paused → Show "Resume" button
    ├─ Own session live → Auto-pause, show "Resume" button
    └─ Other user live → Show "X is currently live..."
    ↓
[Send audio to gateway]
    ├─ Success → Show "🎙️ Streaming started!"
    └─ Error → Show error message
```

### Listener Error Flow

```
Listener opens /radio
    ↓
[Call GET /api/live]
    ├─ Success → Show status
    └─ Error → Show offline (fallback)
    ↓
[Connect to SSE /api/live/events]
    ├─ Success → Listen for updates
    └─ Error → Fallback to manual refresh
    ↓
[Broadcast starts]
    ├─ SSE sends update → UI updates instantly
    └─ SSE fails → Manual refresh button available
    ↓
[Click play]
    ├─ Success → Audio plays
    └─ CORS error → Check Nginx CORS headers
```

---

## 🔍 Error Message Locations

### In BrowserEncoder Component
```typescript
// Line 63: Browser support error
setErrorMessage('Your browser does not support audio streaming...')

// Line 124: Active session error
setErrorMessage('You have an active broadcast session...')

// Line 149: Another user broadcasting
setErrorMessage('${lecturer} is currently live...')

// Line 228: Authentication error
throw new Error('Authentication failed. Please refresh...')

// Line 239: Connection timeout
reject(new Error('Connection timeout'))

// Line 251: WebSocket error
reject(new Error('Failed to connect to broadcast server'))

// Line 267: Connection lost
setErrorMessage('Connection lost during stream')

// Line 317: Stream error (transient)
console.warn('⚠️ Transient stream error:', data.message)

// Line 323: Stream error (fatal)
setErrorMessage(data.message || 'Stream error occurred')

// Line 330: Gateway error
setErrorMessage(data.message || 'Stream error occurred')

// Line 365: Microphone error
throw new Error('Could not access microphone...')
```

### In RadioPlayer Component
```typescript
// Line 125: Audio playback error
console.error('Error playing audio:', error)

// Line 376: Audio stream error
console.error('Audio stream error')
```

---

## ✅ Error Handling Best Practices

### What's Working Well
- ✅ Transient errors don't stop stream
- ✅ Error messages clear on success
- ✅ Global state prevents conflicts
- ✅ Session persistence prevents data loss
- ✅ Smart error classification

### Potential Improvements
- ⚠️ Could add error retry logic with exponential backoff
- ⚠️ Could add error tracking (Sentry, LogRocket)
- ⚠️ Could add user-friendly error codes
- ⚠️ Could add error recovery suggestions

---

## 📋 Error Message Summary Table

| Error | Severity | User Sees | Auto-Clear | Action |
|-------|----------|-----------|-----------|--------|
| Browser not supported | FATAL | Yes | No | Use Chrome/Firefox/Safari |
| Active session | INFO | Yes | No | Click Resume |
| Another user live | BLOCKING | Yes | No | Wait for them to finish |
| Auth failed | FATAL | Yes | No | Refresh page |
| Connection timeout | FATAL | Yes | No | Try again |
| WebSocket error | FATAL | Yes | No | Check gateway |
| Connection lost | CRITICAL | Yes | No | Reconnect |
| Stream error (transient) | WARNING | No | Auto | None needed |
| Stream error (fatal) | FATAL | Yes | No | Try again |
| Audio processing | WARNING | No | Auto | None needed |
| Microphone denied | FATAL | Yes | No | Allow in settings |

---

## 🎯 State Consistency Guarantees

### ✅ Guaranteed
- Single source of truth (MongoDB LiveState)
- All users see same broadcast state
- Real-time updates via SSE
- No race conditions (single document)
- Atomic state updates

### ⚠️ Potential Issues
- If MongoDB is down → Fallback to offline state
- If SSE connection drops → Manual refresh available
- If gateway crashes → Stream stops, state persists
- If Icecast crashes → Stream unavailable, state shows live

---

**Last Updated:** December 12, 2025  
**Status:** ✅ Production Ready
