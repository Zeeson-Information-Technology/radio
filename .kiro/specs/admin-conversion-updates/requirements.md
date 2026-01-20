# Requirements Document

## Introduction

This feature adds a smart refresh button for admins to manually check conversion status of their uploaded files without requiring full page refresh or continuous polling. This provides a cost-effective way for admins to get real-time updates on file conversion progress.

## Glossary

- **Admin**: User with admin or super_admin role who can upload audio files
- **Converting_Files**: Audio files with conversionStatus of 'pending' or 'processing'
- **Smart_Refresh**: Targeted API call that checks only converting files, not all files
- **Audio_Library_Manager**: The admin component that displays uploaded audio files
- **Conversion_Status_Button**: UI button that triggers smart refresh functionality

## Requirements

### Requirement 1: Smart Refresh Button

**User Story:** As an admin who just uploaded files, I want to check conversion status with a button click, so that I can see when my files are ready without refreshing the entire page.

#### Acceptance Criteria

1. WHEN there are files with conversionStatus 'pending' or 'processing', THE Audio_Library_Manager SHALL display a "Check Conversion Status" button
2. WHEN no files are converting, THE Audio_Library_Manager SHALL hide the conversion status button
3. WHEN the admin clicks the conversion status button, THE System SHALL make an API call to check only converting files
4. WHEN the conversion check completes, THE Audio_Library_Manager SHALL update the display with new status information
5. WHEN the button is clicked, THE System SHALL show loading state during the check

### Requirement 2: Targeted Status API

**User Story:** As a system administrator, I want conversion status checks to be cost-efficient, so that we minimize API calls and database queries.

#### Acceptance Criteria

1. THE System SHALL create a dedicated API endpoint for checking conversion status
2. WHEN the conversion status API is called, THE System SHALL query only files with conversionStatus 'pending' or 'processing'
3. WHEN the API returns results, THE System SHALL include recordId, title, and current conversionStatus
4. THE API SHALL return results within 2 seconds for optimal user experience
5. THE System SHALL limit conversion status checks to authenticated admin users only

### Requirement 3: Visual Status Updates

**User Story:** As an admin, I want clear visual feedback about conversion progress, so that I know which files are ready and which are still processing.

#### Acceptance Criteria

1. WHEN a file conversion completes, THE Audio_Library_Manager SHALL update the file's status badge from "Converting..." to ready state
2. WHEN a file conversion fails, THE Audio_Library_Manager SHALL show "Conversion Failed" status
3. WHEN the status check is in progress, THE conversion status button SHALL show loading spinner
4. WHEN all conversions complete, THE conversion status button SHALL automatically hide
5. THE System SHALL show a success toast when conversions complete

### Requirement 4: Session-Based Optimization

**User Story:** As an admin, I want the system to remember which files I uploaded in this session, so that status checks are even more efficient.

#### Acceptance Criteria

1. WHEN an admin uploads a file, THE System SHALL track it in the current session
2. WHEN checking conversion status, THE System SHALL prioritize files from the current session
3. WHEN the admin navigates away and returns, THE System SHALL still show conversion status for session files
4. THE System SHALL clear session tracking when the browser session ends
5. THE System SHALL limit session tracking to maximum 50 files for performance