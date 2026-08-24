# Radio Infrastructure Setup & Audio File Injection - Task List

## Overview
Complete implementation of gateway infrastructure, Icecast streaming, and audio file injection system for the Al-Manhaj radio platform.

## Phase 1: Infrastructure Setup & Verification

- [ ] 1. Verify and configure gateway environment
  - Review current `gateway/.env` configuration
  - Update DigitalOcean Droplet IP address (replace placeholder)
  - Verify MongoDB URI and DigitalOcean Spaces credentials
  - Confirm Icecast configuration in gateway
  - _Requirements: 1.3, 1.4_

- [ ] 1.1 Write test to verify gateway connectivity
  - Test gateway server can start without errors
  - Test gateway responds to health check requests
  - _Requirements: 1.4_

- [ ] 2. Verify Icecast installation on DigitalOcean Droplet
  - Check if Icecast is installed (`icecast2 --version`)
  - If not installed, document installation steps
  - Verify Icecast configuration file exists and is valid
  - Test Icecast service starts successfully
  - _Requirements: 2.1, 2.2_

- [ ] 3. Configure Icecast for low-latency streaming
  - Review and optimize Icecast XML configuration:
    - Set bitrate to 128kbps for balance of quality/bandwidth
    - Configure MIME type as `audio/mpeg`
    - Enable CORS headers
    - Set burst size for smooth streaming
  - Verify `/stream` mount point is configured
  - Test stream endpoint is accessible via HTTP
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 4. Test gateway to Icecast connection
  - Verify gateway can connect to Icecast as source client
  - Test MP3 stream can be sent via HTTP PUT
  - Verify stream is accessible at `http://localhost:8000/stream`
  - Document any connection issues
  - _Requirements: 2.1, 2.2_

- [ ] 5. Test browser to Icecast connectivity
  - From local machine, verify can connect to droplet Icecast
  - Test stream playback in browser audio element
  - Verify no CORS errors in browser console
  - _Requirements: 4.2_

## Phase 2: API Endpoints Enhancement

- [ ] 6. Create audio file injection endpoint
  - Create `app/api/admin/broadcast/inject-file/route.ts`
  - Implement POST handler with request validation
  - Add admin authentication check
  - Validate audio file exists and is ready
  - Call gateway to inject file
  - Return current queue state
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6.1 Write unit tests for file injection endpoint
  - Test successful file injection
  - Test authentication failures
  - Test validation of non-existent files
  - Test validation of files still converting
  - _Requirements: 3.1_

- [ ] 7. Enhance BroadcastService with file queue management
  - Add queue data structure to state
  - Implement `injectFile(audioFileId, action)` method
  - Implement `skipFile()` method
  - Implement `pauseFile()` and `resumeFile()` methods
  - Implement `getQueue()` method
  - Implement file streaming to Icecast
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 7.1 Write unit tests for BroadcastService enhancements
  - Test file injection adds to queue
  - Test file skipping moves to next in queue
  - Test pause/resume state management
  - Test queue ordering (FIFO)
  - Test queue size limits
  - _Requirements: 3.5_

- [ ] 8. Enhance `/api/live` endpoint with queue information
  - Add currently playing file metadata to response
  - Add queue information to response
  - Add upcoming broadcast metadata to response
  - Fetch data from gateway state
  - _Requirements: 5.1, 5.2_

- [ ] 8.1 Write unit tests for enhanced /api/live endpoint
  - Test response includes current file metadata
  - Test response includes queue information
  - Test response accuracy matches gateway state
  - _Requirements: 5.1, 5.2_

- [ ] 9. Enhance `/api/stream-health` endpoint
  - Add gateway status check
  - Add Icecast connectivity check
  - Add active listener count (if available from Icecast)
  - Add current bitrate and quality metrics
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 9.1 Write unit tests for stream health endpoint
  - Test endpoint returns valid health data
  - Test handles gateway disconnection gracefully
  - Test handles Icecast unavailability gracefully
  - _Requirements: 6.1_

## Phase 3: Gateway Service Enhancement

- [ ] 10. Implement file streaming in gateway
  - Create method to fetch audio file from DigitalOcean Spaces
  - Convert audio file to MP3 if needed
  - Stream converted audio to Icecast via HTTP PUT
  - Handle stream errors and disconnections
  - _Requirements: 3.2, 3.3, 2.4_

- [ ] 10.1 Write integration tests for file streaming
  - Test complete flow: file fetch → conversion → Icecast stream
  - Test stream playback in browser
  - Test stream quality metrics
  - _Requirements: 4.3, 4.4_

- [ ] 11. Implement graceful file transitions
  - When current file ends, automatically play next queued file
  - Add small crossfade or buffer to prevent gaps
  - Log file transition events
  - _Requirements: 3.5, 4.4_

- [ ] 11.1 Write tests for file transitions
  - Test files transition without gaps
  - Test queue advances automatically
  - Test metadata updates on transition
  - _Requirements: 4.4_

## Phase 4: Admin UI Enhancement

- [ ] 12. Add file injection controls to admin panel
  - Add "Inject to Live Stream" button to audio library
  - Add "Queue for Broadcast" option with immediate/queued choice
  - Show current queue status in admin panel
  - Display currently playing file metadata
  - _Requirements: 3.1_

- [ ] 12.1 Write unit tests for injection UI
  - Test button appears for ready files only
  - Test file injection API is called on button click
  - Test queue display updates after injection
  - _Requirements: 3.1_

- [ ] 13. Add queue management UI
  - Show list of queued files in admin panel
  - Add skip button to jump to next file
  - Add pause/resume buttons
  - Add remove from queue button
  - _Requirements: 3.4, 3.5_

- [ ] 13.1 Write unit tests for queue management UI
  - Test queue display updates correctly
  - Test skip/pause/resume API calls work
  - Test queue item removal
  - _Requirements: 3.4_

- [ ] 14. Add stream health display
  - Show gateway connection status
  - Show Icecast stream status
  - Display active listener count
  - Show current stream quality/bitrate
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 14.1 Write unit tests for health display
  - Test health data is fetched and displayed
  - Test status indicators update correctly
  - Test handles connection failures gracefully
  - _Requirements: 6.1_

## Phase 5: Radio Player Enhancement

- [ ] 15. Display current file metadata in radio player
  - Show currently playing file title
  - Show lecturer/broadcaster name
  - Show play duration and elapsed time
  - Update metadata every 5 seconds
  - _Requirements: 5.1_

- [ ] 15.1 Write unit tests for player metadata display
  - Test metadata displays correctly
  - Test metadata updates on file change
  - Test handles missing metadata gracefully
  - _Requirements: 5.1_

- [ ] 16. Display schedule in radio player
  - Fetch upcoming broadcasts from `/api/schedule`
  - Show next 3 upcoming broadcasts
  - Display broadcaster name and time
  - Highlight live broadcast if happening now
  - _Requirements: 5.2_

- [ ] 16.1 Write unit tests for schedule display
  - Test schedule fetches and displays correctly
  - Test time calculations are accurate
  - Test handles timezone conversions
  - _Requirements: 5.2_

- [ ] 17. Add listener count to radio player
  - Display active listener count from stream health
  - Update every 10 seconds
  - Show as "N listeners" with icon
  - _Requirements: 5.3_

- [ ] 17.1 Write unit tests for listener count display
  - Test listener count fetches and displays
  - Test updates periodically
  - Test handles unavailable data gracefully
  - _Requirements: 5.3_

## Phase 6: Testing & Verification

- [ ] 18. Integration testing - Full workflow
  - Test: Admin injects file from library
  - Test: File appears as currently playing in radio player
  - Test: File streams without interruption
  - Test: Next file auto-plays after current ends
  - Test: Metadata updates correctly
  - Test: Listener can hear audio in browser
  - _All Requirements_

- [ ] 18.1 Write property-based tests for stream integrity
  - **Property 1: File Queue Integrity**
  - Verify injected file appears in queue or is playing
  - _Requirements: 3.3, 3.5_

- [ ] 18.2 Write property-based tests for metadata accuracy
  - **Property 3: Metadata Accuracy**
  - Verify /api/live metadata matches currently playing file
  - _Requirements: 5.1_

- [ ] 18.3 Write property-based tests for file ordering
  - **Property 4: Queue Ordering**
  - Verify files play in FIFO order
  - _Requirements: 3.5_

- [ ] 19. Performance testing
  - Test gateway handles multiple concurrent connections
  - Test stream maintains consistent bitrate
  - Test no memory leaks during extended streaming
  - Test file injection latency (< 1 second)
  - _Requirements: 4.4_

- [ ] 20. Error scenario testing
  - Test handling of gateway disconnection during stream
  - Test handling of Icecast unavailability
  - Test handling of invalid files
  - Test recovery from stream failures
  - _Requirements: Error Handling in Design_

- [ ] 21. Documentation & cleanup
  - Document gateway setup steps for deployment
  - Document Icecast configuration
  - Document API endpoints and responses
  - Clean up any debug logging
  - Update README with radio streaming info
  - _Requirements: All_

## Notes

- All tasks are required unless marked with `*` (optional)
- Each task maps to specific requirements in design document
- Property-based tests validate universal correctness properties
- Integration tests verify end-to-end workflows
- Focus on low-latency, reliable streaming
- Graceful error handling ensures good user experience
- Security: All admin endpoints require authentication
