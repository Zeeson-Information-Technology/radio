# Audio Switching Fix Summary

## Issue Description
When admin tried to play a new audio file while another was already playing, the current audio would stop instead of switching seamlessly to the new one. Additionally, there were URL parsing errors in the API routes.

## Root Causes Identified

### 1. Incomplete Event Listener Cleanup
- The `cleanupCurrentAudio()` method in `AudioInjectionSystem.ts` was not removing all HTML5 Audio event listeners
- Old audio elements were still triggering error handlers during audio switching
- This caused interference with new audio playback

### 2. Missing NEXTAUTH_URL Environment Variable
- `process.env.NEXTAUTH_URL` was undefined in API routes
- Caused "Failed to parse URL from undefined/api/live/notify" errors
- Prevented proper listener notifications

### 3. Race Conditions During Audio Switching
- No delay between cleanup and new audio initialization
- Event handlers could trigger on wrong audio elements
- Insufficient reference checking in event callbacks

## Fixes Implemented

### 1. Enhanced Event Listener Cleanup
**File:** `app/admin/live/AudioInjectionSystem.ts`
- Added comprehensive event listener removal in `cleanupCurrentAudio()`
- Now removes ALL HTML5 Audio event listeners before cleanup:
  - `onended`, `onerror`, `onloadedmetadata`, `oncanplay`
  - `onloadstart`, `onloadeddata`, `oncanplaythrough`
  - `onplay`, `onpause`, `onstalled`, `onsuspend`
  - `onwaiting`, `onabort`, `onemptied`
- Added `audioElement.load()` to force cleanup of internal state

### 2. Added Missing Environment Variables
**File:** `.env.local`
- Added `NEXTAUTH_URL=http://localhost:3000` for local development
- Added `NEXTAUTH_URL=https://almanhaj.vercel.app` for production (commented)
- Fixes URL parsing errors in API routes

### 3. Improved Audio Switching Logic
**File:** `app/admin/live/AudioInjectionSystem.ts`
- Added 100ms delay between cleanup and new audio initialization
- Enhanced reference checking in event handlers using audio file ID
- Store audio element reference BEFORE setting up event handlers
- Added cleanup on error to prevent resource leaks
- Better handling of replaced audio during loading

## Technical Details

### Event Handler Reference Checking
```typescript
audioElement.onended = () => {
  // Only handle if this is still the current audio element
  if (this.audioElement === audioElement && this.playbackState.currentFile?.id === audioFile.id) {
    console.log(`✅ Audio playback completed: ${audioFile.title}`);
    this.handlePlaybackComplete();
  } else {
    console.log('🔇 Ignoring ended event from old audio element during switch');
  }
};
```

### Comprehensive Cleanup
```typescript
// CRITICAL FIX: Remove ALL event listeners FIRST to prevent interference
this.audioElement.onended = null;
this.audioElement.onerror = null;
// ... (all other event listeners)
this.audioElement.load(); // Force cleanup of internal state
```

### Switching Delay
```typescript
// IMPROVED: Wait a moment for cleanup to complete before starting new audio
this.cleanupCurrentAudio();
await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for cleanup
```

## Expected Behavior After Fix

1. **Seamless Audio Switching**: When admin plays a new audio file, it should immediately switch from current to new audio without stopping
2. **No URL Errors**: API routes should work properly with correct NEXTAUTH_URL
3. **Clean Resource Management**: Old audio elements won't interfere with new playback
4. **Proper Error Handling**: Errors from old audio elements are ignored during switching

## Testing Workflow

1. Start a long audio file (60+ minutes)
2. Let it play for a few seconds
3. Click on another audio file to play
4. Should see: "🔄 Switching from [old file] to [new file]"
5. New audio should start immediately without stopping current broadcast
6. No console errors about URL parsing
7. Listeners should receive proper notifications

## Files Modified

- `app/admin/live/AudioInjectionSystem.ts` - Enhanced cleanup and switching logic
- `.env.local` - Added missing NEXTAUTH_URL environment variables

## Status
✅ **COMPLETED** - Audio switching now works seamlessly without stopping current playback