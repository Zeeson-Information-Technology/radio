# Implementation Plan: Admin Conversion Updates

## Overview

This implementation adds a smart refresh button that allows admins to manually check conversion status of their uploaded files without full page refresh. The solution is cost-effective, targeting only converting files and providing immediate feedback to the admin who uploaded them.

## Tasks

- [x] 1. Create conversion status API endpoint
  - Create `/api/admin/conversion-status` GET endpoint
  - Add authentication middleware for admin-only access
  - Implement database query for files with 'pending' or 'processing' status
  - Return structured response with file updates and counts
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 1.1 Write property test for conversion status API
  - **Property 2: API call targeting**
  - **Property 5: API response structure**
  - **Property 6: Admin authorization**
  - **Validates: Requirements 1.3, 2.2, 2.3, 2.5**

- [x] 2. Create SessionTracker utility
  - Implement SessionTracker class with Set-based storage
  - Add methods: addFile, getFiles, clearSession, isSessionFile
  - Use sessionStorage for browser session persistence
  - Implement 50-file limit with FIFO overflow handling
  - _Requirements: 4.1, 4.3, 4.5_

- [x] 2.1 Write property tests for SessionTracker
  - **Property 8: Session tracking**
  - **Property 10: Session persistence**
  - **Property 11: Session limits**
  - **Validates: Requirements 4.1, 4.3, 4.5**

- [x] 3. Create ConversionStatusButton component
  - Build React component with loading state support
  - Add click handler for status check API call
  - Implement conditional rendering based on converting files count
  - Add loading spinner and file count display
  - Style with Tailwind CSS to match existing design
  - _Requirements: 1.1, 1.2, 1.5, 3.3, 3.4_

- [x] 3.1 Write property tests for ConversionStatusButton
  - **Property 1: Button visibility based on converting files**
  - **Property 4: Loading state consistency**
  - **Validates: Requirements 1.1, 1.2, 1.5, 3.3, 3.4**

- [x] 4. Enhance AudioLibraryManager component
  - Add state for convertingFiles and isCheckingStatus
  - Integrate SessionTracker for upload tracking
  - Implement checkConversionStatus method with API call
  - Add ConversionStatusButton to component render
  - Update file status handling with new status updates
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 4.2_

- [x] 4.1 Write property tests for AudioLibraryManager enhancements
  - **Property 3: Status update propagation**
  - **Property 9: Session priority**
  - **Validates: Requirements 1.4, 3.1, 3.2, 4.2**

- [ ] 5. Add session tracking to AudioUpload component
  - Import and initialize SessionTracker
  - Track uploaded files in session after successful upload
  - Pass session context to AudioLibraryManager
  - _Requirements: 4.1_

- [ ] 5.1 Write unit tests for upload session tracking
  - Test session tracking on successful upload
  - Test session integration with AudioLibraryManager
  - _Requirements: 4.1_

- [ ] 6. Implement success notifications
  - Add toast notifications for completed conversions
  - Show conversion completion count in toast message
  - Integrate with existing toast system
  - _Requirements: 3.5_

- [ ] 6.1 Write property test for success notifications
  - **Property 7: Success notification**
  - **Validates: Requirements 3.5**

- [ ] 7. Add error handling and graceful degradation
  - Implement error boundaries for component crashes
  - Add network error handling with retry options
  - Add fallback behavior when session tracking fails
  - Add timeout handling for API calls
  - _Design: Error Handling section_

- [ ] 7.1 Write unit tests for error scenarios
  - Test network error handling
  - Test authentication error handling
  - Test session tracking failures
  - _Design: Error Handling section_

- [ ] 8. Checkpoint - Integration testing
  - Test complete workflow: upload → convert → refresh → update
  - Verify button appears/disappears correctly
  - Test session tracking across page navigation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Performance optimization
  - Optimize API queries to minimize database load
  - Add request debouncing to prevent rapid button clicks
  - Implement efficient state updates to prevent unnecessary re-renders
  - _Requirements: 2.4_

- [ ] 9.1 Write performance tests
  - Test API response time under load
  - Test UI responsiveness during status checks
  - _Requirements: 2.4_

- [ ] 10. Final integration and testing
  - Wire all components together in AudioLibraryManager
  - Test complete user workflow end-to-end
  - Verify cost-effectiveness (no continuous polling)
  - Ensure backward compatibility with existing functionality
  - _All Requirements_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Focus on cost-effectiveness - no continuous polling, only targeted checks
- Session tracking provides optimization for recently uploaded files
- Smart refresh gives admins control over when to check status