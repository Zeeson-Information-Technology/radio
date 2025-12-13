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
      hasPlaybackUrl: !!recording.playbackUrl
    });
    
    // Generate signed URL for S3 access (avoids CORS issues)
    if (sourceKey) {
      try {
        const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
        const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
        
        const s3Client = new S3Client({
          region: process.env.AWS_REGION || "us-east-1",
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
          },
        });

        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET || "almanhaj-radio-audio",
          Key: sourceKey,
        });

        // Generate signed URL valid for 1 hour
        audioUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        console.log("✅ Generated signed URL successfully");
      } catch (error) {
        console.error("❌ Error generating signed URL:", error);
        console.log("📋 S3 Config:", {
          bucket: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_REGION,
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
        });
        // Fall back to direct URL (may have CORS issues)
        audioUrl = sourceUrl;
      }
    } else {
      // No storage key, use direct URLs as fallback
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
        format: usePlaybackUrl ? recording.playbackFormat : recording.format,
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