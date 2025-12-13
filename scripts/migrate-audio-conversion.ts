/**
 * Database Migration Script for Audio Conversion Support
 * 
 * This script adds conversion-related fields to existing AudioRecording documents
 * and sets appropriate default values based on the file format.
 */

import { connectDB } from "../lib/db";
import AudioRecording from "../lib/models/AudioRecording";
import AudioConversionService from "../lib/services/audioConversion";

async function migrateAudioConversion() {
  try {
    console.log("🎵 Starting audio conversion migration...");
    
    // Connect to database
    await connectDB();
    
    // Get all existing recordings
    const recordings = await AudioRecording.find({});
    console.log(`📊 Found ${recordings.length} existing recordings`);
    
    let updatedCount = 0;
    let needsConversionCount = 0;
    
    for (const recording of recordings) {
      const updates: any = {};
      
      // Set original URL if not present
      if (!recording.originalUrl) {
        updates.originalUrl = recording.storageUrl;
      }
      
      // Set original format if not present
      if (!recording.originalFormat) {
        updates.originalFormat = recording.format;
      }
      
      // Determine if conversion is needed
      const needsConversion = AudioConversionService.needsConversion(recording.format);
      
      if (needsConversion) {
        // File needs conversion
        updates.conversionStatus = 'pending';
        updates.playbackFormat = 'mp3';
        // playbackUrl will be set after conversion
        needsConversionCount++;
      } else {
        // File is already web-compatible
        updates.conversionStatus = 'ready';
        updates.playbackFormat = recording.format;
        updates.playbackUrl = recording.storageUrl;
      }
      
      // Set conversion attempts to 0 if not present
      if (recording.conversionAttempts === undefined) {
        updates.conversionAttempts = 0;
      }
      
      // Update the recording
      await AudioRecording.findByIdAndUpdate(recording._id, updates);
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`📝 Updated ${updatedCount}/${recordings.length} recordings...`);
      }
    }
    
    console.log("✅ Migration completed successfully!");
    console.log(`📊 Migration Summary:`);
    console.log(`   - Total recordings: ${recordings.length}`);
    console.log(`   - Updated recordings: ${updatedCount}`);
    console.log(`   - Need conversion: ${needsConversionCount}`);
    console.log(`   - Ready for playback: ${recordings.length - needsConversionCount}`);
    
    if (needsConversionCount > 0) {
      console.log("");
      console.log("⚠️  Next Steps:");
      console.log("   1. Ensure FFmpeg is installed on your server");
      console.log("   2. Start the conversion service to process pending files");
      console.log("   3. Monitor conversion progress in the admin interface");
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAudioConversion()
    .then(() => {
      console.log("🎉 Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateAudioConversion;