# Requirements Document

## Introduction

Fix the issue where listeners see an audio player for deleted/non-existent audio files when a presenter starts a new live broadcast. The problem occurs because the `currentAudioFile` field in the database is not being cleared when a new live broadcast begins.

## Glossary

- **Live_Broadcast**: A real-time audio stream from presenter to listeners
- **Audio_File_State**: Database field tracking currently playing pre-recorded audio
- **Presenter**: User who initiates live broadcasts
- **Listener**: User who receives live broadcasts
- **Database_State**: MongoDB LiveState document containing broadcast information

## Requirements

### Requirement 1: Clear Audio File State on Broadcast Start

**User Story:** As a listener, I want to see only the live broadcast when a presenter starts streaming, so that I don't see confusing audio players for deleted files.

#### Acceptance Criteria

1. WHEN a presenter starts a new live broadcast, THE System SHALL clear any existing currentAudioFile data from the database
2. WHEN a presenter starts a new live broadcast, THE System SHALL set currentAudioFile to null in the LiveState document
3. WHEN listeners receive broadcast start notifications, THE System SHALL not include any currentAudioFile information
4. WHEN the live API endpoint is called during a new broadcast, THE System SHALL return currentAudioFile as null

### Requirement 2: Validate Audio File State Consistency

**User Story:** As a system administrator, I want to ensure audio file state is consistent across all broadcast operations, so that listeners always see accurate information.

#### Acceptance Criteria

1. WHEN a broadcast stops, THE System SHALL clear the currentAudioFile field
2. WHEN a broadcast reconnects, THE System SHALL preserve the currentAudioFile state only if it was set during the current session
3. WHEN audio injection starts, THE System SHALL set currentAudioFile with valid metadata
4. WHEN audio injection stops, THE System SHALL clear the currentAudioFile field

### Requirement 3: Prevent Stale Audio File References

**User Story:** As a presenter, I want to ensure that when I start broadcasting, listeners only see my live content, so that there's no confusion about what's currently playing.

#### Acceptance Criteria

1. WHEN the startStreaming method is called, THE System SHALL explicitly set currentAudioFile to null
2. WHEN the reconnectStreaming method is called, THE System SHALL clear currentAudioFile unless it was set in the current session
3. WHEN database state is updated for broadcast start, THE System SHALL include currentAudioFile: null in the update
4. WHEN SSE notifications are sent for broadcast start, THE System SHALL not include currentAudioFile data