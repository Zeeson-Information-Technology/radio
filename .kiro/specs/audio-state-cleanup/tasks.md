# Implementation Plan: Audio State Cleanup

## Overview

Fix the bug where listeners see audio players for deleted/non-existent audio files when presenters start new live broadcasts. The implementation involves updating the BroadcastService to explicitly clear the currentAudioFile field during broadcast lifecycle operations.

## Tasks

- [x] 1. Update BroadcastService startStreaming method
  - Modify the database update call to explicitly include `currentAudioFile: null`
  - Ensure the fix applies to both new broadcasts and session recovery scenarios
  - _Requirements: 1.1, 1.2, 3.1, 3.3_

- [x] 1.1 Write property test for broadcast start clearing audio state
  - **Property 1: Broadcast Start Clears Audio State**
  - **Validates: Requirements 1.1, 1.2, 3.1, 3.3**

- [ ] 2. Update BroadcastService reconnectStreaming method
  - Add logic to clear currentAudioFile unless it was set in the current session
  - Implement session tracking to determine if audio file belongs to current session
  - _Requirements: 2.2, 3.2_

- [ ] 2.1 Write property test for reconnection audio state handling
  - **Property 5: Reconnection Preserves Session Audio State**
  - **Validates: Requirements 2.2, 3.2**

- [ ] 3. Verify stopStreaming method clears audio state
  - Ensure the existing `resetBroadcastControlState()` call properly clears currentAudioFile
  - Add explicit currentAudioFile: null to the stopStreaming database update if missing
  - _Requirements: 2.1, 2.4_

- [ ] 3.1 Write property test for broadcast stop clearing audio state
  - **Property 2: Broadcast Stop Operations Clear Audio State**
  - **Validates: Requirements 2.1, 2.4**

- [ ] 4. Add helper method for audio state management
  - Create `clearAudioFileState()` method in BroadcastService
  - Centralize audio state clearing logic for consistency
  - Update all broadcast methods to use the helper
  - _Requirements: 1.1, 2.1, 2.4_

- [ ] 5. Update SSE notification logic
  - Verify broadcast start notifications don't include currentAudioFile data
  - Ensure `notifyListeners` method excludes stale audio file information
  - _Requirements: 1.3, 3.4_

- [ ] 5.1 Write property test for SSE notification content
  - **Property 3: SSE Notifications Exclude Stale Audio Data**
  - **Validates: Requirements 1.3, 3.4**

- [ ] 6. Verify live API endpoint behavior
  - Test that `/api/live` returns currentAudioFile as null during new broadcasts
  - Ensure the endpoint correctly reflects cleared audio state
  - _Requirements: 1.4_

- [ ] 6.1 Write property test for API response accuracy
  - **Property 4: API Returns Accurate Audio State**
  - **Validates: Requirements 1.4**

- [ ] 7. Test audio injection functionality
  - Verify audio injection still works correctly after the fixes
  - Ensure `injectAudio` and `stopAudioInjection` methods handle state properly
  - _Requirements: 2.3_

- [ ] 7.1 Write property test for audio injection metadata
  - **Property 6: Audio Injection Sets Valid Metadata**
  - **Validates: Requirements 2.3**

- [ ] 8. Integration testing and verification
  - Test the complete broadcast lifecycle: start → audio injection → stop
  - Verify listeners see correct state transitions
  - Test presenter reconnection scenarios
  - _Requirements: All_

- [ ] 8.1 Write integration tests for broadcast lifecycle
  - Test full broadcast flow with audio state transitions
  - Test concurrent broadcast scenarios
  - _Requirements: All_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The fix is primarily in the gateway server's BroadcastService
- No frontend changes should be needed as the issue is server-side