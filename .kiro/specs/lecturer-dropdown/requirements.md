# Requirements Document

## Introduction

Improve the lecturer selection process in the audio upload form by providing a dropdown of existing lecturers while still allowing new lecturer creation.

## Glossary

- **Lecturer Dropdown**: A searchable dropdown that shows existing lecturers from the database
- **Combo Input**: A UI component that combines dropdown selection with text input capability
- **Lecturer Database**: Collection of speaker/lecturer records with names and metadata
- **Auto-Complete**: Feature that suggests existing lecturers as user types

## Requirements

### Requirement 1: Existing Lecturer Selection

**User Story:** As an admin uploading audio, I want to select from existing lecturers in a dropdown, so that I don't have to remember and retype lecturer names.

#### Acceptance Criteria

1. WHEN I click on the lecturer field, THEN I SHALL see a dropdown list of existing lecturers
2. WHEN I select a lecturer from the dropdown, THEN the field SHALL be populated with that lecturer's name
3. WHEN I type in the field, THEN the dropdown SHALL filter to show matching lecturers
4. THE dropdown SHALL show lecturers sorted by most frequently used (recording count)

### Requirement 2: New Lecturer Creation

**User Story:** As an admin uploading audio, I want to type a new lecturer name if they're not in the dropdown, so that I can add new speakers to the system.

#### Acceptance Criteria

1. WHEN I type a name that doesn't exist in the dropdown, THEN I SHALL be able to submit it as a new lecturer
2. WHEN I submit with a new lecturer name, THEN the system SHALL create a new lecturer record automatically
3. WHEN a new lecturer is created, THEN they SHALL appear in future dropdown lists
4. THE system SHALL prevent duplicate lecturers with similar names

### Requirement 3: User Experience Enhancement

**User Story:** As an admin, I want the lecturer selection to be fast and intuitive, so that I can upload audio efficiently.

#### Acceptance Criteria

1. WHEN I start typing, THEN the system SHALL show suggestions immediately (no loading delay)
2. WHEN I see a lecturer I want, THEN I SHALL be able to select them with one click
3. WHEN the dropdown is open, THEN I SHALL be able to navigate with keyboard arrows
4. THE field SHALL show clear visual indicators for existing vs new lecturers

### Requirement 4: Data Consistency

**User Story:** As a system administrator, I want to prevent duplicate lecturer entries, so that the database remains clean and organized.

#### Acceptance Criteria

1. WHEN comparing lecturer names, THEN the system SHALL ignore case differences
2. WHEN comparing lecturer names, THEN the system SHALL ignore extra whitespace
3. WHEN a similar name exists, THEN the system SHALL suggest the existing lecturer
4. THE system SHALL maintain lecturer statistics (recording count) accurately