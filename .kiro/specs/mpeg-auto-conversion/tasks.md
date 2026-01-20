# Implementation Plan: MPEG Auto-Conversion

## Overview

Enable automatic background conversion of MPEG files to MP3 format for seamless web playback.

## Tasks

- [x] 1. Update conversion detection logic
  - Add "mpeg" to the needsConversion() method in AudioConversionService
  - Ensure MPEG files are automatically queued for conversion
  - _Requirements: 1.1, 1.2_

- [ ]* 1.1 Write property test for MPEG conversion detection
  - **Property 1: MPEG Conversion Detection**
  - **Validates: Requirements 1.1**

- [ ] 2. Test conversion flow for MPEG files
  - Verify MPEG files go through complete conversion process
  - Confirm MP3 output is generated and uploaded to S3
  - _Requirements: 1.3, 1.4_

- [ ]* 2.1 Write property test for conversion status progression
  - **Property 2: Conversion Status Progression**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 3. Update frontend audio player components
  - Modify player to use playbackUrl for converted MPEG files
  - Show conversion status instead of "cannot play" message
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 3.1 Write property test for playback URL availability
  - **Property 3: Playback URL Availability**
  - **Validates: Requirements 3.1**

- [ ] 4. Improve user experience during conversion
  - Add "Processing..." indicator for pending conversions
  - Show helpful messages during conversion process
  - _Requirements: 3.2, 3.4_

- [ ]* 4.1 Write property test for original file preservation
  - **Property 4: Original File Preservation**
  - **Validates: Requirements 1.4**

- [x] 5. Test complete MPEG upload and playback workflow
  - Upload MPEG file and verify automatic conversion
  - Confirm converted file plays in web browser
  - Test error handling for conversion failures
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Checkpoint - Verify MPEG auto-conversion works
  - Test actual MPEG file upload and conversion
  - Confirm seamless playback experience
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The core fix is adding "mpeg" to the conversion detection logic
- Frontend updates ensure users see conversion status instead of errors
- Background processing maintains system performance during conversion