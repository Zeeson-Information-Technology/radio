# Implementation Plan: Lecturer Dropdown

## Overview

Replace the simple lecturer text input with a smart dropdown that shows existing lecturers while allowing new lecturer creation.

## Tasks

- [x] 1. Create lecturers API endpoint
  - Create `/api/lecturers` GET endpoint
  - Return lecturers sorted by recording count (most used first)
  - Include name, recording count, and verification status
  - _Requirements: 1.1, 1.4_

- [x] 2. Create LecturerComboBox component
  - Build reusable combo-box component with dropdown functionality
  - Implement real-time filtering as user types
  - Add keyboard navigation (arrows, enter, escape)
  - _Requirements: 1.2, 1.3, 3.3_

- [x] 3. Add visual enhancements
  - Show recording count badges for each lecturer
  - Add checkmark for verified lecturers
  - Highlight "Create new" option for non-existing names
  - _Requirements: 3.4_

- [x] 4. Integrate with AudioUpload component
  - Replace text input with LecturerComboBox
  - Maintain existing form validation
  - Ensure backward compatibility with upload API
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5. Add duplicate prevention
  - Implement fuzzy matching for similar names
  - Show suggestions when typing similar to existing lecturers
  - Case-insensitive and whitespace-tolerant matching
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Performance optimizations
  - Add client-side caching for lecturer list
  - Implement debounced filtering (300ms delay)
  - Add loading states and error handling
  - _Requirements: 3.1_

- [ ] 7. Test complete lecturer selection workflow
  - Test selecting existing lecturer from dropdown
  - Test creating new lecturer by typing
  - Test keyboard navigation and accessibility
  - Verify upload process works with both scenarios

- [ ] 8. Checkpoint - Verify lecturer dropdown works
  - Test with real lecturer data
  - Confirm improved user experience
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The existing upload API doesn't need changes - it still receives lecturer name
- The Lecturer.findOrCreate method handles both existing and new lecturers
- Focus on user experience improvements while maintaining current functionality
- Component should be reusable for other parts of the system