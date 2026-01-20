# Requirements Document

## Introduction

Improve the lecturer selection experience in the audio upload form by providing a dropdown/autocomplete selector that shows existing lecturers while still allowing new lecturer creation.

## Glossary

- **Lecturer Selector**: A UI component that combines dropdown selection with text input for choosing existing or creating new lecturers
- **Autocomplete**: A feature that suggests existing lecturers as the user types
- **Lecturer Database**: The collection of all lecturers who have audio content in the system
- **findOrCreate Pattern**: The current system that automatically creates lecturers when they don't exist

## Requirements

### Requirement 1: Lecturer Selection Interface

**User Story:** As an admin uploading audio, I want to easily select from existing lecturers or add a new one, so that I don't have to remember exact spelling and can avoid duplicates.

#### Acceptance Criteria

1. WHEN I start typing a lecturer name, THEN the system SHALL show matching existing lecturers in a dropdown
2. WHEN I select an existing lecturer from the dropdown, THEN the field SHALL be populated with their exact name
3. WHEN I type a name that doesn't exist, THEN I SHALL be able to create a new lecturer
4. THE system SHALL prevent duplicate lecturers with slightly different spellings

### Requirement 2: Lecturer Data Management

**User Story:** As an admin, I want to see lecturer statistics and information, so that I can make informed decisions about content organization.

#### Acceptance Criteria

1. WHEN I view the lecturer dropdown, THEN I SHALL see lecturer names with their recording counts
2. WHEN I hover over a lecturer option, THEN I SHALL see additional information like total recordings
3. THE dropdown SHALL show lecturers sorted by recording count (most active first)
4. THE system SHALL show only active lecturers in the dropdown

### Requirement 3: API for Lecturer Data

**User Story:** As a developer, I want an API endpoint to fetch lecturer data, so that the frontend can populate the dropdown efficiently.

#### Acceptance Criteria

1. WHEN the upload form loads, THEN it SHALL fetch available lecturers from an API endpoint
2. WHEN searching for lecturers, THEN the API SHALL support name-based filtering
3. THE API SHALL return lecturer name, ID, recording count, and active status
4. THE API SHALL be optimized for fast autocomplete responses

### Requirement 4: Backward Compatibility

**User Story:** As a system administrator, I want the new lecturer selector to work with existing data, so that no existing functionality is broken.

#### Acceptance Criteria

1. WHEN the new selector is implemented, THEN all existing lecturers SHALL appear in the dropdown
2. WHEN creating a new lecturer, THEN it SHALL use the same `findOrCreate` logic as before
3. THE upload API SHALL continue to work with both old and new frontend implementations
4. ALL existing lecturer data SHALL remain intact and accessible