import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import AudioConversionService from "@/lib/services/audioConversion";
import mongoose from "mongoose";

/**
 * GET /api/audio/conversion-status/[id]
 * Get conversion status for a specific recording
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

    // Find the recording
    const recording = await AudioRecording.findById(id).select(
      'title conversionStatus conversionError conversionAttempts conversionCompletedAt originalFormat playbackFormat playbackUrl'
    );

    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Recording not found" },
        { status: 404 }
      );
    }

    // Get queue status
    const conversionService = AudioConversionService.getInstance();
    const queueStatus = conversionService.getQueueStatus();

    return NextResponse.json({
      success: true,
      data: {
        recordingId: recording._id,
        title: recording.title,
        conversionStatus: recording.conversionStatus,
        conversionError: recording.conversionError,
        conversionAttempts: recording.conversionAttempts,
        conversionCompletedAt: recording.conversionCompletedAt,
        originalFormat: recording.originalFormat,
        playbackFormat: recording.playbackFormat,
        hasPlaybackUrl: !!recording.playbackUrl,
        queueStatus: {
          queueLength: queueStatus.queueLength,
          isProcessing: queueStatus.isProcessing
        }
      }
    });

  } catch (error) {
    console.error("Error getting conversion status:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audio/conversion-status/[id]
 * Retry conversion for a failed recording
 */
export async function POST(
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

    // Find the recording
    const recording = await AudioRecording.findById(id);

    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Recording not found" },
        { status: 404 }
      );
    }

    // Check if retry is allowed
    if (recording.conversionStatus !== 'failed') {
      return NextResponse.json(
        { success: false, message: "Can only retry failed conversions" },
        { status: 400 }
      );
    }

    if (recording.conversionAttempts >= 3) {
      return NextResponse.json(
        { success: false, message: "Maximum retry attempts exceeded" },
        { status: 400 }
      );
    }

    // Reset conversion status and retry
    await AudioRecording.findByIdAndUpdate(id, {
      conversionStatus: 'pending',
      conversionError: undefined
    });

    // Add to conversion queue
    const conversionService = AudioConversionService.getInstance();
    await conversionService.addConversionJob(id, recording.originalUrl || recording.storageUrl);

    return NextResponse.json({
      success: true,
      message: "Conversion retry initiated",
      data: {
        recordingId: id,
        conversionStatus: 'pending'
      }
    });

  } catch (error) {
    console.error("Error retrying conversion:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}