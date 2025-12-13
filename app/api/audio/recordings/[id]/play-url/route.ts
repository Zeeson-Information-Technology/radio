import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import { generateSignedUrl } from "@/lib/services/s3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to database
    await connectDB();

    const { id: recordingId } = await params;

    // Find the recording
    const recording = await AudioRecording.findById(recordingId);
    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Recording not found" },
        { status: 404 }
      );
    }

    // Check if recording is public or user has access
    if (!recording.isPublic || recording.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Recording not available" },
        { status: 403 }
      );
    }

    // Generate signed URL for secure access
    const playbackUrl = await generateSignedUrl(recording.storageKey, 3600); // 1 hour expiry

    // Update play count
    recording.playCount += 1;
    recording.lastPlayed = new Date();
    await recording.save();

    return NextResponse.json({
      success: true,
      url: playbackUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      duration: recording.duration,
      title: recording.title,
      lecturer: recording.lecturerName,
      type: recording.type
    });

  } catch (error) {
    console.error("Error generating play URL:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}