# Design Document

## Overview

Replace the simple text input for lecturer names with a smart combo-box that provides dropdown selection of existing lecturers while still allowing new lecturer creation. This improves user experience and data consistency.

## Architecture

The solution involves creating a new `LecturerComboBox` component that combines:
- Searchable dropdown with existing lecturers
- Text input for new lecturer names
- Real-time filtering and suggestions
- API integration for lecturer data

## Components and Interfaces

### New LecturerComboBox Component
```typescript
interface LecturerComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}
```

### API Endpoint for Lecturers
- **Endpoint**: `/api/lecturers`
- **Method**: GET
- **Response**: List of lecturers sorted by recording count
- **Caching**: Client-side caching for performance

### Integration Points
- **AudioUpload Component**: Replace text input with LecturerComboBox
- **Lecturer Model**: No changes needed (existing findOrCreate works)
- **Upload API**: No changes needed (still receives lecturer name)

## Data Models

### Lecturer API Response
```typescript
interface LecturerOption {
  _id: string;
  name: string;
  recordingCount: number;
  isVerified: boolean;
}
```

### Component State
```typescript
interface ComboBoxState {
  inputValue: string;
  isOpen: boolean;
  filteredLecturers: LecturerOption[];
  selectedIndex: number;
  isLoading: boolean;
}
```

## User Interface Design

### Visual States
1. **Closed State**: Looks like regular text input with dropdown arrow
2. **Open State**: Shows dropdown with filtered lecturer list
3. **Typing State**: Filters list in real-time as user types
4. **Selected State**: Highlights selected lecturer option
5. **New Lecturer State**: Shows "Create new: [name]" option

### Keyboard Navigation
- **Arrow Up/Down**: Navigate through options
- **Enter**: Select highlighted option
- **Escape**: Close dropdown
- **Tab**: Close dropdown and move to next field

### Visual Indicators
- **Verified lecturers**: ✓ checkmark icon
- **Recording count**: Small badge showing number of recordings
- **New lecturer**: "+" icon for create new option

## Implementation Plan

### Phase 1: API Endpoint
1. Create `/api/lecturers` endpoint
2. Return lecturers sorted by recording count
3. Include necessary fields (name, count, verified status)

### Phase 2: LecturerComboBox Component
1. Create reusable combo-box component
2. Implement dropdown functionality
3. Add keyboard navigation
4. Add filtering logic

### Phase 3: Integration
1. Replace text input in AudioUpload component
2. Test with existing upload flow
3. Ensure backward compatibility

### Phase 4: Enhancements
1. Add caching for better performance
2. Add visual indicators for lecturer status
3. Implement fuzzy search for better matching

## Error Handling

### Network Errors
- Show cached lecturers if API fails
- Allow manual text input as fallback
- Display error message for user awareness

### Duplicate Prevention
- Client-side fuzzy matching for similar names
- Server-side case-insensitive comparison
- Suggestion prompts for similar existing lecturers

## Performance Considerations

### Optimization Strategies
- Client-side caching of lecturer list
- Debounced filtering (300ms delay)
- Virtualized dropdown for large lists
- Lazy loading if lecturer count exceeds 100

### Caching Strategy
- Cache lecturer list for 5 minutes
- Invalidate cache after successful upload
- Store in browser localStorage for persistence

## Testing Strategy

### Unit Tests
- Component rendering and interaction
- Filtering logic accuracy
- Keyboard navigation functionality
- API integration and error handling

### Integration Tests
- Complete upload flow with existing lecturer
- Complete upload flow with new lecturer
- Dropdown behavior with various data states
- Performance with large lecturer lists

### User Experience Tests
- Typing speed and responsiveness
- Visual feedback and clarity
- Accessibility compliance
- Mobile device compatibility