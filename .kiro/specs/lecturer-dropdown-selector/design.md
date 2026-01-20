# Design Document

## Overview

This design creates a smart lecturer selector that combines the convenience of a dropdown with the flexibility of free text input. Users can quickly select from existing lecturers or create new ones seamlessly.

## Architecture

The solution involves three main components:
1. **API Endpoint**: `/api/lecturers` to fetch lecturer data
2. **Frontend Component**: Smart autocomplete selector
3. **Enhanced Upload Flow**: Improved lecturer handling

## Components and Interfaces

### API Endpoint Design
```typescript
GET /api/lecturers?search=<query>&limit=<number>

Response:
{
  success: true,
  lecturers: [
    {
      _id: "lecturer_id",
      name: "Sheikh Ahmad",
      recordingCount: 25,
      totalDuration: 1200, // minutes
      isVerified: true
    }
  ]
}
```

### Frontend Component Design
```typescript
interface LecturerSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}
```

### Component Features
- **Autocomplete**: Shows suggestions as user types
- **Keyboard Navigation**: Arrow keys to navigate options
- **Click Selection**: Mouse click to select options
- **Free Text**: Allows typing new lecturer names
- **Visual Indicators**: Shows recording count and verification status

## Data Models

### Lecturer API Response
```typescript
interface LecturerOption {
  _id: string;
  name: string;
  recordingCount: number;
  totalDuration: number;
  isVerified: boolean;
  isActive: boolean;
}
```

### Component State
```typescript
interface LecturerSelectorState {
  inputValue: string;
  suggestions: LecturerOption[];
  isLoading: boolean;
  showDropdown: boolean;
  selectedIndex: number;
}
```

## User Experience Flow

### Typing Experience
1. **User starts typing** → API call with debounced search
2. **Suggestions appear** → Dropdown shows matching lecturers
3. **User selects option** → Field populated with exact name
4. **User continues typing** → Can create new lecturer

### Visual Design
```
┌─────────────────────────────────────────┐
│ Speaker/Lecturer *                      │
│ ┌─────────────────────────────────────┐ │
│ │ Sheikh Ah...                    ▼   │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 📚 Sheikh Ahmad (25 recordings)    │ │
│ │ 📚 Sheikh Ahmed (12 recordings)    │ │
│ │ 📚 Sheikh Ali (8 recordings)       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: API Development
1. Create `/api/lecturers` endpoint
2. Implement search and filtering
3. Add caching for performance

### Phase 2: Component Development
1. Build LecturerSelector component
2. Implement autocomplete logic
3. Add keyboard navigation

### Phase 3: Integration
1. Replace text input in AudioUpload
2. Test with existing data
3. Ensure backward compatibility

## Performance Considerations

### API Optimization
- **Debounced Search**: Wait 300ms after user stops typing
- **Result Limiting**: Return max 10 suggestions
- **Caching**: Cache frequent searches
- **Indexing**: Database index on lecturer name

### Frontend Optimization
- **Lazy Loading**: Load suggestions only when needed
- **Memoization**: Cache API responses
- **Virtual Scrolling**: For large lecturer lists

## Error Handling

### API Errors
- **Network Issues**: Show "Unable to load lecturers" message
- **Empty Results**: Show "No lecturers found" with option to create new
- **Server Errors**: Graceful fallback to text input mode

### User Input Validation
- **Empty Input**: Standard required field validation
- **Long Names**: Limit to reasonable character count
- **Special Characters**: Allow Unicode for Arabic names

## Testing Strategy

### Unit Tests
- LecturerSelector component behavior
- API endpoint functionality
- Search and filtering logic

### Integration Tests
- Complete upload flow with lecturer selection
- Backward compatibility with existing data
- Performance under load

### User Experience Tests
- Keyboard navigation works correctly
- Mouse interaction is intuitive
- Mobile responsiveness

## Accessibility

### Keyboard Support
- **Tab**: Navigate to/from component
- **Arrow Keys**: Navigate suggestions
- **Enter**: Select highlighted option
- **Escape**: Close dropdown

### Screen Reader Support
- **ARIA Labels**: Proper labeling for suggestions
- **Live Regions**: Announce selection changes
- **Role Attributes**: Combobox pattern implementation

## Migration Strategy

### Backward Compatibility
- Keep existing `findOrCreate` logic
- Support both old and new frontend versions
- No database schema changes required

### Rollout Plan
1. **Deploy API endpoint** (no frontend changes)
2. **Deploy new component** (feature flag controlled)
3. **Gradual rollout** to admin users
4. **Full deployment** after testing