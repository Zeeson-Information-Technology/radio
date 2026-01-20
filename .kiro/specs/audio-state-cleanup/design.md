# Design Document: Audio State Cleanup

## Overview

This design addresses the bug where listeners see audio players for deleted/non-existent audio files when a presenter starts a new live broadcast. The root cause is that the `currentAudioFile` field in the LiveState database document is not being cleared when new broadcasts begin, causing stale audio file references to persist.

## Architecture

The fix involves updating the broadcast lifecycle management in the gateway server's BroadcastService to explicitly clear audio file state during broadcast initialization and state transitions.

### Current Flow (Problematic)
```
Presenter starts broadcast → Update LiveState (partial) → Listeners see stale currentAudioFile
```

### Fixed Flow
```
Presenter starts broadcast → Clear currentAudioFile → Update LiveState (complete) → Listeners see clean state
```

## Components and Interfaces

### 1. BroadcastService (gateway/services/BroadcastService.js)

**Modified Methods:**
- `startStreaming(ws, user, streamConfig)` - Add currentAudioFile: null to database update
- `reconnectStreaming(ws, user, streamConfig)` - Clear currentAudioFile unless from current session
- `stopStreaming(ws, user)` - Ensure currentAudioFile is cleared

**New Helper Method:**
- `clearAudioFileState()` - Centralized method to clear audio file state

### 2. DatabaseService (gateway/services/DatabaseService.js)

**Enhanced Methods:**
- `updateLiveState(stateData)` - Already supports currentAudioFile updates
- `resetBroadcastControlState()` - Already includes currentAudioFile: null

### 3. Live API Endpoint (app/api/live/route.ts)

**Verification:**
- Ensure currentAudioFile is properly returned as null when cleared
- Maintain existing functionality for valid audio file states

## Data Models

### LiveState Document Structure
```javascript
{
  isLive: boolean,
  isMuted: boolean,
  mutedAt: Date | null,
  title: string | null,
  lecturer: string | null,
  startedAt: Date | null,
  currentAudioFile: {
    id: string,
    title: string,
    duration: number,
    startedAt: Date
  } | null,  // ← This field needs proper lifecycle management
  // ... other fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Broadcast Start Clears Audio State
*For any* live broadcast start operation (startStreaming method call), the currentAudioFile field should be set to null in the database and excluded from SSE notifications
**Validates: Requirements 1.1, 1.2, 3.1, 3.3**

### Property 2: Broadcast Stop Operations Clear Audio State
*For any* broadcast stop operation (stopStreaming or audio injection stop), the currentAudioFile field should be cleared from the database
**Validates: Requirements 2.1, 2.4**

### Property 3: SSE Notifications Exclude Stale Audio Data
*For any* broadcast start SSE notification, the message payload should not include currentAudioFile information
**Validates: Requirements 1.3, 3.4**

### Property 4: API Returns Accurate Audio State
*For any* live API request during a new broadcast (without audio injection), the response should return currentAudioFile as null
**Validates: Requirements 1.4**

### Property 5: Reconnection Preserves Session Audio State
*For any* broadcast reconnection, the currentAudioFile state should be preserved only if it was set during the current session, otherwise it should be cleared
**Validates: Requirements 2.2, 3.2**

### Property 6: Audio Injection Sets Valid Metadata
*For any* audio injection start operation, the currentAudioFile field should be set with valid metadata including id, title, duration, and startedAt
**Validates: Requirements 2.3**

## Error Handling

### Database Update Failures
- If LiveState update fails during broadcast start, log error and retry
- Ensure broadcast can continue even if audio state clearing fails
- Provide fallback mechanism to clear state on next successful update

### Concurrent Access
- Handle race conditions where multiple broadcast operations occur simultaneously
- Ensure audio state updates are atomic within each broadcast session
- Prevent one session's audio state from affecting another session

### Network Failures
- If SSE notification fails, ensure database state is still correct
- Retry notifications for critical state changes
- Graceful degradation when real-time updates are unavailable

## Testing Strategy

### Unit Tests
- Test `startStreaming` method clears currentAudioFile
- Test `reconnectStreaming` preserves or clears audio state appropriately
- Test `stopStreaming` clears all broadcast state including audio files
- Test database update methods handle currentAudioFile correctly

### Property-Based Tests
- Generate random broadcast sequences and verify audio state consistency
- Test concurrent broadcast operations maintain proper state isolation
- Verify audio file lifecycle properties across all broadcast operations
- Test that listeners never receive invalid audio file references

### Integration Tests
- Test full broadcast lifecycle from start to stop
- Verify SSE notifications contain correct audio state information
- Test API endpoint returns accurate currentAudioFile data
- Test presenter UI reflects correct audio state after broadcast operations

Both unit tests and property-based tests are essential for comprehensive coverage. Unit tests validate specific scenarios and edge cases, while property-based tests verify universal correctness properties across all possible inputs and state transitions.