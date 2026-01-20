# Implementation Plan: Live Audio Optimization

## Overview

Optimize the live audio injection system by adopting the proven streaming approach from UniversalAudioPlayer.tsx, eliminating the 12-15 second delay and fixing seeking issues for long-duration audio files.

## Tasks

- [ ] 1. Optimize AudioInjectionSystem for streaming playback
- [x] 1.1 Refactor playAudioFile method to use HTML5 Audio streaming approach
  - Replace complex Web Audio API buffer loading with simple HTML5 Audio element
  - Use `preload="metadata"` for fast response like UniversalAudioPlayer
  - Implement immediate playback start without waiting for full file load
  - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.4_

- [ ]* 1.2 Write property test for fast playback start
  - **Property 1: Fast Playback Start**
  - **Validates: Requirements 1.1, 1.2**

- [x] 1.3 Simplify Web Audio API mixing chain
  - Reduce audio nodes to essential mixing only (microphone + audio file)
  - Remove complex MediaElementAudioSourceNode disconnection issues
  - Implement stable audio graph that doesn't break during seeks
  - _Requirements: 3.2, 3.3, 6.3, 6.4_

- [ ]* 1.4 Write property test for reliable seeking
  - **Property 2: Reliable Seeking**
  - **Validates: Requirements 2.1, 2.3**

- [ ] 2. Optimize BrowserEncoder audio playback workflow
- [x] 2.1 Refactor handleAudioFilePlay to use single API call pattern
  - Remove double API call (eliminate /api/admin/broadcast/audio/play first call)
  - Call /api/audio/play/{fileId} directly for audio URL
  - Start playback immediately after getting URL
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 2.2 Write property test for single API call efficiency
  - **Property 3: Single API Call Efficiency**
  - **Validates: Requirements 4.1, 4.2**

- [ ] 2.3 Implement background gateway notifications
  - Move gateway notification to background (non-blocking)
  - Update UI immediately without waiting for gateway response
  - Handle gateway notification failures gracefully
  - _Requirements: 4.3, 4.4, 7.4_

- [ ]* 2.4 Write property test for background notification independence
  - **Property 6: Background Notification Independence**
  - **Validates: Requirements 4.3, 4.4**

- [x] 3. Checkpoint - Test basic audio playback optimization
- Ensure all tests pass, verify 60+ minute audio files start within 3 seconds, ask the user if questions arise.

- [ ] 4. Fix seeking and control issues
- [x] 4.1 Implement reliable seeking using HTML5 Audio currentTime
  - Replace Web Audio API seeking with direct HTML5 Audio seeking
  - Ensure seeking doesn't disconnect audio sources
  - Implement smooth forward/backward controls
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4.2 Fix audio control methods (pause, resume, skip)
  - Ensure pause/resume doesn't break mixing chain
  - Implement skip forward/backward without stopping playback
  - Maintain broadcast stream during all control operations
  - _Requirements: 2.1, 2.2, 2.4_

- [ ]* 4.3 Write property test for microphone mixing consistency
  - **Property 4: Microphone Mixing Consistency**
  - **Validates: Requirements 6.3, 6.4**

- [ ] 5. Implement long-duration audio support
- [ ] 5.1 Add memory management for extended playback
  - Implement stable memory usage patterns for 4+ hour files
  - Add progress tracking accuracy for long durations
  - Handle network interruptions during long sessions
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ]* 5.2 Write property test for long duration stability
  - **Property 5: Long Duration Stability**
  - **Validates: Requirements 5.1, 5.3**

- [ ] 5.3 Add performance monitoring and logging
  - Track audio loading times and alert on delays > 3 seconds
  - Monitor memory usage during long playback sessions
  - Log seek operation response times
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 5.4 Write unit tests for performance monitoring
  - Test loading time tracking
  - Test memory usage monitoring
  - _Requirements: 8.1, 8.2_

- [ ] 6. Enhance error handling and recovery
- [ ] 6.1 Implement comprehensive error handling
  - Add specific error messages for different failure types
  - Implement automatic retry with exponential backoff
  - Provide manual retry options in UI
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6.2 Add graceful degradation features
  - Continue local playback if gateway notification fails
  - Restore microphone automatically on audio failures
  - Maintain broadcast continuity during errors
  - _Requirements: 7.4, 7.5, 6.5_

- [ ]* 6.3 Write unit tests for error handling
  - Test network error recovery
  - Test audio playback error handling
  - Test microphone restoration on failures
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 7. Integration and testing
- [ ] 7.1 Update BroadcastControlPanel integration
  - Ensure UI controls work with optimized audio system
  - Update progress tracking and duration display
  - Test all audio control buttons (play, pause, seek, skip)
  - _Requirements: 1.5, 2.4, 5.4_

- [ ] 7.2 Test with real long-duration audio files
  - Test with 60+ minute audio files
  - Verify seeking works at any position
  - Confirm memory usage remains stable
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 7.3 Write integration tests for complete workflow
  - Test end-to-end audio playback during live broadcast
  - Test listener notifications during audio playback
  - Test system recovery from various failure scenarios
  - _Requirements: 1.1, 2.1, 4.1, 6.1_

- [ ] 8. Final checkpoint - Comprehensive testing
- Ensure all tests pass, verify long audio files work perfectly, confirm seeking is reliable, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Focus on adopting UniversalAudioPlayer.tsx streaming approach
- Prioritize user experience over gateway synchronization
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases