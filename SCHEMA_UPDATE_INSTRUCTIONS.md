# Audio Schema Update Instructions

## Issue
The AudioRecording model schema needs to be updated to support new audio formats (AMR, FLAC, etc.).

## Quick Fix
1. **Restart the development server** to reload the updated schema:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **If the issue persists**, the database might have cached the old schema. Clear the collection:
   ```bash
   # Connect to MongoDB and run:
   db.audiorecordings.drop()
   ```

## What was updated
- Added support for: `amr`, `amr-wb`, `flac`, `webm`, `wma`, `3gp`, `3gp2`
- Updated MIME type detection for better AMR file support
- Added circular progress loader for uploads

## Files changed
- `lib/models/AudioRecording.ts` - Updated format enum
- `lib/utils/audio-formats.ts` - Enhanced MIME type support
- `app/admin/audio/AudioUpload.tsx` - Improved validation + circular progress
- `app/api/audio/upload/route.ts` - Better file validation

The schema should automatically update when the server restarts.