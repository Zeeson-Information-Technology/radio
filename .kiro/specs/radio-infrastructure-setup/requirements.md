# Radio Infrastructure Setup & Audio File Injection - Requirements

## Feature Overview
Enable the Al-Manhaj radio platform to stream audio from the library through the DigitalOcean gateway to listeners. This includes setting up the gateway infrastructure, configuring Icecast streaming, and implementing the ability to inject pre-recorded audio files into the live broadcast stream.

## User Stories

### 1. Gateway Infrastructure Setup
**As a** platform administrator
**I want** the gateway server to be properly configured on DigitalOcean Droplet
**So that** audio can be streamed reliably from the backend to listeners

#### Acceptance Criteria
1.1 Gateway server starts on port 8080 and accepts WebSocket connections
1.2 Gateway server connects to DigitalOcean Spaces for audio file retrieval
1.3 Gateway environment variables are correctly set for production
1.4 Health check endpoint (`/api/stream-health`) returns gateway status

### 2. Icecast Streaming Configuration
**As a** platform administrator
**I want** Icecast to be installed and configured on the DigitalOcean Droplet
**So that** audio can be streamed via HTTP to web browsers and radio players

#### Acceptance Criteria
2.1 Icecast server runs on port 8000
2.2 Stream endpoint is accessible at `/stream` mount point
2.3 CORS headers are properly configured for cross-origin requests
2.4 Audio bitrate and format are optimized for low-latency streaming
2.5 Icecast logs show active listener connections

### 3. Audio File Injection from Library
**As an** admin broadcaster
**I want** to select and inject audio files from the library into the live stream
**So that** listeners can hear pre-recorded lectures and content when I'm not live

#### Acceptance Criteria
3.1 Admin can trigger audio file injection via API endpoint
3.2 Selected audio file is streamed through gateway to Icecast
3.3 Current playing file metadata is tracked and available via API
3.4 File playback can be paused, resumed, and skipped
3.5 Multiple files can be queued for sequential playback

### 4. Stream Connectivity Testing
**As a** developer
**I want** to verify that the complete audio pipeline works end-to-end
**So that** listeners receive audio without interruptions

#### Acceptance Criteria
4.1 Test connection: Next.js API → Gateway → Icecast
4.2 Test connection: Browser → Icecast stream endpoint
4.3 Test audio injection: File selected → Streamed to listeners
4.4 Stream quality is maintained (no stuttering, consistent bitrate)

### 5. Radio Player UI Enhancement
**As a** listener
**I want** to see the currently playing file and upcoming broadcasts
**So that** I know what content is being streamed

#### Acceptance Criteria
5.1 Radio player displays current broadcaster name or file title
5.2 Radio player shows schedule of upcoming broadcasts
5.3 Player displays listener count when available
5.4 Player has intuitive controls for volume and playback

### 6. Stream Health Monitoring
**As a** platform administrator
**I want** visibility into stream health and listener status
**So that** I can troubleshoot issues and ensure reliability

#### Acceptance Criteria
6.1 `/api/stream-health` endpoint returns gateway and Icecast status
6.2 Active listener count is tracked and available
6.3 Stream bitrate and quality metrics are logged
6.4 Alerts are triggered on stream failure or connectivity loss

## Dependencies

- DigitalOcean Spaces (S3-compatible): Already configured for audio storage
- MongoDB Atlas: Already configured for state storage
- Gateway Node.js server: Exists in `gateway/` folder, needs configuration
- Icecast: Needs installation and configuration on Droplet
- Next.js backend: Already has API infrastructure

## Out of Scope

- Cloudinary integration (using DigitalOcean Spaces as primary storage)
- Advanced analytics/reporting
- Mobile app development
- Listener authentication/subscription features

## Success Metrics

- Stream remains active for extended periods without interruption
- Audio files inject and play without gaps or stuttering
- Admins can control playback (pause, resume, skip) via admin panel
- Radio page UI accurately reflects live state and schedule
- No console errors related to streaming or connectivity
