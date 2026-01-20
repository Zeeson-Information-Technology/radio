# Implementation Plan: Lecturer Dropdown Selector

## Overview

Create a smart lecturer selector that combines dropdown selection with text input for better UX when uploading audio files.

## Tasks

- [ ] 1. Create lecturer API endpoint
  - Create `/api/lecturers` GET endpoint
  - Implement search and filtering functionality
  - Add pagination and sorting by recording count
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 2. Build LecturerSelector component
  - Create autocomplete input component
  - Implement dropdown with lecturer suggestions
  - Add keyboard navigation (arrow keys, enter, escape)
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3. Add lecturer statistics display
  - Show recording count in dropdown options
  - Display verification status indicators
  - Sort lecturers by activity (most recordings first)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Integrate with AudioUpload form
  - Replace text input with LecturerSelector component
  - Ensure form validation works correctly
  - Test with existing upload flow
  - _Requirements: 1.4, 4.1, 4.2_

- [ ] 5. Add performance optimizations
  - Implement debounced search (300ms delay)
  - Add API response caching
  - Limit results to 10 suggestions for performance
  - _Requirements: 3.4_

- [ ] 6. Test backward compatibility
  - Verify existing lecturers appear in dropdown
  - Test new lecturer creation still works
  - Ensure upload API handles both old and new data
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Add accessibility features
  - Implement ARIA labels and roles
  - Add keyboard navigation support
  - Test with screen readers
  - _Requirements: 1.1, 1.2_

- [ ] 8. Mobile responsiveness
  - Ensure dropdown works on mobile devices
  - Test touch interactions
  - Optimize for small screens
  - _Requirements: 1.1_

- [ ] 9. Checkpoint - Test complete lecturer selection flow
  - Test selecting existing lecturers
  - Test creating new lecturers
  - Verify upload process works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The component should feel like a smart text input that happens to have suggestions
- Existing lecturer creation logic (`findOrCreate`) remains unchanged
- API endpoint can be used by other parts of the system in the future
- Focus on user experience - make it fast and intuitive