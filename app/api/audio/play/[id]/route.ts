import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import mongoose from "mongoose";

/**
 * GET /api/audio/play/[id]
 * Serves audio file for playback and tracks play count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid recording ID" },
        { status: 400 }
      );
    }

    // Find the recording (admin access - no public restrictions)
    const recording = await AudioRecording.findOne({
      _id: id,
      status: "active"
    });

    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Recording not found or not accessible" },
        { status: 404 }
      );
    }

    // Check conversion status
    if (recording.conversionStatus === 'processing') {
      return NextResponse.json({
        success: false,
        message: "Audio is still being processed for web playback",
        conversionStatus: 'processing'
      }, { status: 202 }); // 202 Accepted - processing
    }

    if (recording.conversionStatus === 'failed') {
      return NextResponse.json({
        success: false,
        message: "Audio conversion failed. Please try re-uploading the file.",
        conversionStatus: 'failed',
        conversionError: recording.conversionError
      }, { status: 422 }); // 422 Unprocessable Entity
    }

    // Update play count (async, don't wait)
    AudioRecording.findByIdAndUpdate(
      id,
      {
        $inc: { playCount: 1 },
        lastPlayed: new Date()
      }
    ).exec().catch(err => console.error("Error updating play count:", err));

    // Determine which URL to use for playback
    const usePlaybackUrl = recording.playbackUrl && recording.conversionStatus === 'ready';
    const sourceUrl = usePlaybackUrl ? recording.playbackUrl : recording.storageUrl;
    const sourceKey = usePlaybackUrl ? 
      recording.playbackUrl?.split('.amazonaws.com/')[1] : 
      recording.storageKey;
    
    // Determine the format to return
    const responseFormat = (usePlaybackUrl ? (recording.playbackFormat || 'mp3') : (recording.format || 'mp3')) || 'mp3';
    console.log('📤 Play endpoint response format:', {
      usePlaybackUrl,
      recordingPlaybackFormat: recording.playbackFormat,
      recordingFormat: recording.format,
      responseFormat,
      conversionStatus: recording.conversionStatus
    });

    if (!sourceUrl) {
      return NextResponse.json(
        { success: false, message: "No audio URL available" },
        { status: 404 }
      );
    }
    
    let audioUrl = "";
    
    console.log("🎵 Audio URL generation:", {
      recordingId: recording._id,
      conversionStatus: recording.conversionStatus,
      usePlaybackUrl,
      sourceUrl,
      sourceKey,
      hasStorageKey: !!recording.storageKey,
      hasPlaybackUrl: !!recording.playbackUrl,
      preferredStorage: recording.preferredStorage || 'digitalocean',
      hasCloudinaryUrl: !!recording.cloudinaryUrl
    });
    
    // Determine which storage to serve from
    const preferredStorage = recording.preferredStorage || 'digitalocean';
    
    if (preferredStorage === 'cloudinary' && recording.cloudinaryUrl) {
      // Serve from Cloudinary (fallback or preferred option)
      audioUrl = recording.cloudinaryUrl;
      console.log("☁️ Using Cloudinary URL:", audioUrl);
    } else if (sourceKey) {
      // Default: Use DigitalOcean CDN URL for playback (has better CORS support)
      const region = process.env.AWS_REGION || "lon1";
      const bucket = process.env.AWS_S3_BUCKET || "almanhaj-radio";
      audioUrl = `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${sourceKey}`;
      console.log("✅ Using DigitalOcean CDN URL:", audioUrl);
    } else {
      audioUrl = sourceUrl;
    }
    
    if (!audioUrl) {
      console.error("❌ No audio URL available for recording:", recording._id);
      return NextResponse.json(
        { success: false, message: "Audio file not accessible" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: recording._id,
        title: recording.title,
        lecturerName: recording.lecturerName,
        duration: recording.duration,
        format: responseFormat,
        originalFormat: recording.originalFormat || recording.format,
        conversionStatus: recording.conversionStatus,
        audioUrl,
        playCount: recording.playCount + 1 // Return updated count
      }
    });
    
  } catch (error) {
    console.error("Error serving audio:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add logging middleware
console.log('📊 Play endpoint initialized');