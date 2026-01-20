# Design Document

## Overview

This design enables automatic background conversion of MPEG files to MP3 format for web playback. The existing conversion infrastructure will be extended to include MPEG files, ensuring users can play uploaded MPEG files without manual intervention.

## Architecture

The solution leverages the existing `AudioConversionService` infrastructure, which already handles AMR and other format conversions. The key change is updating the conversion detection logic to include MPEG files.

### Current Conversion Flow
1. File upload → Format detection → Conversion check → Queue if needed
2. Background processing → FFmpeg conversion → S3 upload → Database update
3. Playback → Use converted MP3 version

### MPEG Integration
MPEG files will follow the same flow as AMR files, being automatically queued for conversion to MP3.

## Components and Interfaces

### AudioConversionService Updates
- **Method**: `needsConversion(format: string)`
- **Current Logic**: Only converts AMR, AMR-WB, 3GP, 3GP2, WMA
- **Updated Logic**: Include MPEG in conversion list

### Upload Route Integration
- **File**: `app/api/audio/upload/route.ts`
- **Current Behavior**: Checks `needsConversion()` and queues accordingly
- **Expected Behavior**: MPEG files will be queued for conversion

### Frontend Player Updates
- **Component**: Audio player components
- **Current Behavior**: Shows "cannot play" message for MPEG
- **Updated Behavior**: Use `playbackUrl` when available, show conversion status

## Data Models

### AudioRecording Conversion Fields
```typescript
// Existing fields that will be used for MPEG conversion
originalUrl: string;        // S3 URL to original MPEG file
playbackUrl: string;        // S3 URL to converted MP3 file
conversionStatus: "pending" | "processing" | "ready" | "failed";
originalFormat: "mpeg";     // Original uploaded format
playbackFormat: "mp3";     // Format used for playback
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: MPEG Conversion Detection
*For any* uploaded MPEG file, the system should automatically detect it needs conversion and queue it for processing
**Validates: Requirements 1.1**

### Property 2: Conversion Status Progression
*For any* MPEG file undergoing conversion, the status should progress from "pending" → "processing" → "ready" or "failed"
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Playback URL Availability
*For any* successfully converted MPEG file, a playback URL should be available for web player use
**Validates: Requirements 3.1**

### Property 4: Original File Preservation
*For any* converted MPEG file, the original file should remain accessible via the original URL
**Validates: Requirements 1.4**

## Error Handling

### Conversion Failure Scenarios
- **FFmpeg Error**: Retry up to 3 times with exponential backoff
- **S3 Upload Error**: Retry with different temporary file names
- **Network Issues**: Queue for later retry

### User Experience During Conversion
- **Pending**: Show "Processing..." indicator
- **Processing**: Show progress or spinner
- **Ready**: Enable normal playback
- **Failed**: Show conversion error with download option

## Testing Strategy

### Unit Tests
- Verify `needsConversion()` returns true for MPEG files
- Test conversion status updates work correctly
- Confirm playback URL generation for MPEG files

### Integration Tests
- Test complete MPEG upload and conversion flow
- Verify converted files are playable in web browsers
- Test error handling and retry logic

### Property-Based Tests
- Generate random MPEG files and verify conversion detection
- Test conversion status progression for various scenarios
- Verify playback URL availability after successful conversion

**Property Test Configuration**:
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: **Feature: mpeg-auto-conversion, Property {number}: {property_text}**

## Implementation Plan

### Phase 1: Conversion Detection
1. Update `AudioConversionService.needsConversion()` to include MPEG
2. Test that MPEG files are queued for conversion

### Phase 2: Frontend Updates
1. Update audio player to handle conversion status
2. Show appropriate UI states for pending/processing/ready/failed

### Phase 3: User Experience Polish
1. Add conversion progress indicators
2. Improve error messages and user guidance
3. Test complete user workflow