# Design Document: Live Audio Optimization

## Overview

This design optimizes the live audio injection system by adopting the proven streaming approach from UniversalAudioPlayer.tsx. The key insight is to simplify the audio architecture, eliminate double API calls, and use HTML5 Audio as the primary playback mechanism with minimal Web Audio API complexity.

## Architecture

### Current Architecture Issues
```
[Admin clicks play] → [API call 1: /api/admin/broadcast/audio/play] → [API call 2: /api/audio/play/{id}] → [Complex Web Audio mixing] → [Gateway notification] → [Playback starts after 12-15s]
```

### Optimized Architecture
```
[Admin clicks play] → [Single API call: /api/audio/play/{id}] → [HTML5 Audio streaming] → [Simple Web Audio mixing] → [Background gateway notification] → [Playback starts in <3s]
```

## Components and Interfaces

### 1. Optimized AudioInjectionSystem

**Key Changes:**
- Primary playback via HTML5 Audio element (like UniversalAudioPlayer)
- Simplified Web Audio API usage for mixing only
- Single API call pattern
- Background gateway notifications

**Interface:**
```typescript
interface OptimizedAudioInjectionSystem {
  // Fast playback methods
  playAudioFile(audioFile: AudioFile): Promise<void>
  
  // Reliable seeking methods  
  seekTo(timeInSeconds: number): Promise<void>
  skipForward(seconds: number): Promise<void>
  skipBackward(seconds: number): Promise<void>
  
  // Simple control methods
  pausePlayback(): void
  resumePlayback(): Promise<void>
  stopPlayback(): void
  
  // Mixing methods
  getMixedStream(): MediaStream | null
  setMicrophoneGain(gain: number): void
}
```

### 2. Streamlined BrowserEncoder Integration

**Optimized handleAudioFilePlay:**
```typescript
const handleAudioFilePlay = async (fileId: string, fileName: string, duration: number) => {
  try {
    // Step 1: Get audio URL (single call - FAST)
    const response = await fetch(`/api/audio/play/${fileId}`);
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error('Failed to get audio URL');
    }
    
    // Step 2: Start playback immediately (streaming approach)
    const audioFile = {
      id: fileId,
      title: fileName,
      url: result.data.audioUrl,
      duration
    };
    
    await audioInjectionSystemRef.current.playAudioFile(audioFile);
    
    // Step 3: Update UI immediately
    setAudioInjectionActive(true);
    setCurrentAudioFile(fileName);
    setMessage(`Playing: ${fileName}`);
    
    // Step 4: Notify gateway in background (non-blocking)
    fetch('/api/admin/broadcast/audio/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, fileName, duration }),
    }).catch(error => console.warn('Gateway notification failed:', error));
    
  } catch (error) {
    setErrorMessage(`Failed to start audio: ${error.message}`);
  }
};
```

## Data Models

### AudioFile Interface
```typescript
interface AudioFile {
  id: string
  title: string
  url: string        // Direct S3/CDN URL for streaming
  duration: number   // Duration in seconds
}
```

### PlaybackState Interface
```typescript
interface PlaybackState {
  isPlaying: boolean
  isPaused: boolean
  currentFile: AudioFile | null
  progress: number
  startTime: number
  pausedAt: number
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Fast Playback Start
*For any* audio file regardless of duration, when playback is initiated, the system should start playing within 3 seconds
**Validates: Requirements 1.1, 1.2**

### Property 2: Reliable Seeking
*For any* seek operation on any audio file, the playback should continue without stopping and reach the target position within 1 second
**Validates: Requirements 2.1, 2.3**

### Property 3: Single API Call Efficiency
*For any* audio playback request, the system should make exactly one API call to obtain the audio URL before starting playback
**Validates: Requirements 4.1, 4.2**

### Property 4: Microphone Mixing Consistency
*For any* transition between microphone and audio playback, the broadcast output stream should remain continuous without interruption
**Validates: Requirements 6.3, 6.4**

### Property 5: Long Duration Stability
*For any* audio file longer than 60 minutes, the system should maintain stable playback and accurate progress tracking throughout the entire duration
**Validates: Requirements 5.1, 5.3**

### Property 6: Background Notification Independence
*For any* audio playback operation, UI responsiveness should not be blocked by gateway notification delays
**Validates: Requirements 4.3, 4.4**

## Error Handling

### Error Categories
1. **Network Errors**: Failed API calls, connection timeouts
2. **Audio Errors**: Unsupported formats, corrupted files, playback failures
3. **Mixing Errors**: Web Audio API issues, stream disconnections
4. **Gateway Errors**: Notification failures, synchronization issues

### Error Recovery Strategies
1. **Automatic Retry**: Network errors with exponential backoff
2. **Graceful Degradation**: Continue local playback if gateway notification fails
3. **User Feedback**: Clear error messages with actionable suggestions
4. **Fallback Mechanisms**: Restore microphone if audio playback fails

## Testing Strategy

### Unit Tests
- Test individual audio operations (play, pause, seek, stop)
- Test error handling for various failure scenarios
- Test API integration with mocked responses
- Test microphone mixing transitions

### Property-Based Tests
- **Property 1**: Generate random audio files and verify playback start time < 3 seconds
- **Property 2**: Generate random seek positions and verify continuous playback
- **Property 3**: Verify single API call pattern for all playback requests
- **Property 4**: Test microphone/audio transitions maintain stream continuity
- **Property 5**: Test long-duration files (generate files up to 4 hours) for stability
- **Property 6**: Verify UI responsiveness independent of gateway response times

Each property test should run minimum 100 iterations and be tagged with:
**Feature: live-audio-optimization, Property {number}: {property_text}**

### Integration Tests
- Test complete audio playback workflow from UI to broadcast output
- Test real-time listener notifications during audio playback
- Test system behavior with actual long-duration audio files
- Test network interruption recovery during playback

## Implementation Notes

### Key Optimizations
1. **Streaming First**: Use HTML5 Audio streaming like UniversalAudioPlayer
2. **Minimal Web Audio**: Only use Web Audio API for essential mixing
3. **Background Notifications**: Don't block UI for gateway communication
4. **Single API Pattern**: Eliminate double API calls
5. **Error Resilience**: Graceful handling of all failure modes

### Performance Targets
- **Playback Start**: < 3 seconds for any file size
- **Seek Response**: < 1 second for any position
- **Memory Usage**: Stable for 4+ hour playback sessions
- **UI Responsiveness**: No blocking operations in main thread