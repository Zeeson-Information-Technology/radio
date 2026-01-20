# Design Document

## Overview

The Admin Conversion Updates feature provides a cost-effective way for admins to check the conversion status of their uploaded files without full page refresh or continuous polling. The solution uses a smart refresh button that appears only when files are converting and makes targeted API calls to check only those specific files.

## Architecture

### Component Architecture
```
AudioLibraryManager (Enhanced)
├── ConversionStatusButton (New)
├── AudioList (Existing)
└── SessionTracker (New utility)
```

### API Architecture
```
/api/admin/conversion-status (New)
├── Authentication middleware
├── Query converting files only
└── Return targeted status updates
```

### Data Flow
```
1. Admin uploads file → Session tracking starts
2. File needs conversion → Button appears
3. Admin clicks button → API call to check status
4. Status updates → UI refreshes with new data
5. All conversions complete → Button disappears
```

## Components and Interfaces

### ConversionStatusButton Component

**Purpose:** Provides manual refresh functionality for conversion status

**Props Interface:**
```typescript
interface ConversionStatusButtonProps {
  convertingFiles: AudioFile[];
  onStatusCheck: () => Promise<void>;
  isLoading: boolean;
}
```

**Behavior:**
- Only renders when `convertingFiles.length > 0`
- Shows loading spinner during status check
- Automatically hides when no files are converting
- Displays count of converting files

### Enhanced AudioLibraryManager

**New State:**
```typescript
interface AudioLibraryState {
  // Existing state...
  convertingFiles: AudioFile[];
  isCheckingStatus: boolean;
  sessionUploadedFiles: Set<string>; // Track current session uploads
}
```

**New Methods:**
- `checkConversionStatus()` - Calls API and updates state
- `trackSessionUpload(fileId)` - Adds file to session tracking
- `updateFileStatus(updates)` - Updates specific files in the list

### SessionTracker Utility

**Purpose:** Track files uploaded in current browser session

```typescript
class SessionTracker {
  private uploadedFiles: Set<string> = new Set();
  
  addFile(fileId: string): void;
  getFiles(): string[];
  clearSession(): void;
  isSessionFile(fileId: string): boolean;
}
```

## Data Models

### Conversion Status API Response

```typescript
interface ConversionStatusResponse {
  success: boolean;
  updates: Array<{
    recordId: string;
    title: string;
    conversionStatus: 'ready' | 'failed' | 'processing';
    playbackUrl?: string;
    conversionError?: string;
  }>;
  completedCount: number;
  stillProcessing: number;
}
```

### Audio File Status Update

```typescript
interface AudioFileStatusUpdate {
  recordId: string;
  conversionStatus: 'ready' | 'failed' | 'processing';
  playbackUrl?: string;
  conversionError?: string;
  isPlayable: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all testable acceptance criteria, I identified several properties that can be consolidated:
- Properties 1.1 and 1.2 are inverses and can be combined into one comprehensive button visibility property
- Properties 1.5 and 3.3 both test loading state and can be combined
- Properties 3.1 and 3.2 both test status badge updates and can be combined
- Properties 1.2 and 3.4 both test button hiding and can be combined

### Core Properties

**Property 1: Button visibility based on converting files**
*For any* list of audio files, the conversion status button should be visible if and only if there are files with conversionStatus 'pending' or 'processing'
**Validates: Requirements 1.1, 1.2, 3.4**

**Property 2: API call targeting**
*For any* conversion status check request, the API should query only files with conversionStatus 'pending' or 'processing', not all files
**Validates: Requirements 1.3, 2.2**

**Property 3: Status update propagation**
*For any* conversion status API response, all file status updates should be reflected in the UI display
**Validates: Requirements 1.4, 3.1, 3.2**

**Property 4: Loading state consistency**
*For any* conversion status check operation, the button should show loading state during the entire API call duration
**Validates: Requirements 1.5, 3.3**

**Property 5: API response structure**
*For any* successful conversion status API response, it should include recordId, title, and conversionStatus for each file
**Validates: Requirements 2.3**

**Property 6: Admin authorization**
*For any* conversion status API request, only authenticated admin users should receive successful responses
**Validates: Requirements 2.5**

**Property 7: Success notification**
*For any* conversion status check that finds completed conversions, a success toast should be displayed
**Validates: Requirements 3.5**

**Property 8: Session tracking**
*For any* file uploaded by an admin, it should be added to the current session tracking
**Validates: Requirements 4.1**

**Property 9: Session priority**
*For any* conversion status check, files from the current session should be prioritized in the query
**Validates: Requirements 4.2**

**Property 10: Session persistence**
*For any* browser navigation within the same session, session-tracked files should remain available
**Validates: Requirements 4.3**

**Property 11: Session limits**
*For any* session tracking operation, the maximum number of tracked files should not exceed 50
**Validates: Requirements 4.5**

## Error Handling

### API Error Handling
- **Network Errors:** Show toast notification with retry option
- **Authentication Errors:** Redirect to login or show permission error
- **Server Errors:** Display user-friendly error message and log details
- **Timeout Errors:** Show timeout message with manual retry button

### UI Error Handling
- **Component Errors:** Use error boundaries to prevent crashes
- **State Errors:** Reset to safe default state if corruption detected
- **Session Errors:** Clear corrupted session data and start fresh

### Graceful Degradation
- If session tracking fails, fall back to checking all converting files
- If API is unavailable, show manual refresh message
- If toast system fails, use browser alerts as fallback

## Testing Strategy

### Dual Testing Approach
This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:** Focus on specific examples, edge cases, and integration points
- Test button rendering with specific file states
- Test API endpoint with known data sets
- Test session tracking with specific scenarios
- Test error conditions and edge cases

**Property Tests:** Verify universal properties across all inputs
- Generate random file lists and verify button visibility rules
- Test API responses with various file combinations
- Verify session tracking with random upload sequences
- Test UI updates with random status change patterns

### Property-Based Testing Configuration
- **Library:** Use Jest with @fast-check/jest for property-based testing
- **Iterations:** Minimum 100 iterations per property test
- **Test Tags:** Each property test must reference its design document property
- **Tag Format:** `Feature: admin-conversion-updates, Property {number}: {property_text}`

### Testing Focus Areas
1. **Button Visibility Logic:** Ensure button appears/disappears correctly
2. **API Optimization:** Verify only converting files are queried
3. **State Management:** Test UI updates match API responses
4. **Session Tracking:** Verify session persistence and limits
5. **Error Scenarios:** Test all error conditions gracefully handled

<function_calls>
<invoke name="prework">
<parameter name="featureName">admin-conversion-updates