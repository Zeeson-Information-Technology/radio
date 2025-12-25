import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import { deleteAudioFromS3 } from "@/lib/services/s3";
import { canDeleteAudio } from "@/lib/utils/audioAccessUtils";

/**
 * GET /api/admin/audio/[id]
 * Get audio recording details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    const recording = await AudioRecording.findById(id)
      .populate('lecturer', 'name')
      .populate('category', 'name')
      .populate('createdBy', 'name email');

    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Audio recording not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    const userContext = {
      id: admin._id.toString(), // Note: using 'id' not '_id'
      role: admin.role,
      email: admin.email
    };

    const audioFile = {
      id: recording._id.toString(), // Note: using 'id' not '_id'
      createdBy: recording.createdBy._id.toString(),
      visibility: recording.visibility,
      sharedWith: recording.sharedWith?.map(id => id.toString()) || [] // Convert ObjectId[] to string[]
    };

    // For GET requests, we can be more permissive - allow viewing if user has any access
    const hasAccess = recording.visibility === 'public' || 
                     recording.createdBy._id.toString() === admin._id.toString() ||
                     (recording.visibility === 'shared' && recording.sharedWith?.some(id => id.toString() === admin._id.toString())) ||
                     admin.role === 'super_admin' || admin.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      recording: {
        _id: recording._id,
        title: recording.title,
        description: recording.description,
        lecturerName: recording.lecturerName,
        lecturer: recording.lecturer,
        category: recording.category,
        type: recording.type,
        tags: recording.tags,
        year: recording.year,
        duration: recording.duration,
        fileSize: recording.fileSize,
        format: recording.format,
        playbackFormat: recording.playbackFormat,
        conversionStatus: recording.conversionStatus,
        visibility: recording.visibility,
        sharedWith: recording.sharedWith,
        broadcastReady: recording.broadcastReady,
        playCount: recording.playCount,
        createdBy: recording.createdBy,
        createdAt: recording.createdAt,
        updatedAt: recording.updatedAt
      }
    });

  } catch (error) {
    console.error("Error fetching audio recording:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/audio/[id]
 * Delete audio recording
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    const recording = await AudioRecording.findById(id);
    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Audio recording not found" },
        { status: 404 }
      );
    }

    // Check delete permissions
    const userContext = {
      id: admin._id.toString(), // Note: using 'id' not '_id'
      role: admin.role,
      email: admin.email
    };

    const audioFile = {
      id: recording._id.toString(), // Note: using 'id' not '_id'
      createdBy: recording.createdBy.toString(),
      visibility: recording.visibility,
      sharedWith: recording.sharedWith?.map(id => id.toString()) || [] // Convert ObjectId[] to string[]
    };

    if (!canDeleteAudio(audioFile, userContext)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions to delete this audio file" },
        { status: 403 }
      );
    }

    // Delete file from S3 storage
    try {
      if (recording.storageKey) {
        await deleteAudioFromS3(recording.storageKey);
      }
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete the recording from database
    await AudioRecording.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Audio recording deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting audio recording:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/audio/[id]
 * Update audio recording metadata
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    const recording = await AudioRecording.findById(id);
    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Audio recording not found" },
        { status: 404 }
      );
    }

    // Check modify permissions
    const userContext = {
      id: admin._id.toString(), // Note: using 'id' not '_id'
      role: admin.role,
      email: admin.email
    };

    const audioFile = {
      id: recording._id.toString(), // Note: using 'id' not '_id'
      createdBy: recording.createdBy.toString(),
      visibility: recording.visibility,
      sharedWith: recording.sharedWith?.map(id => id.toString()) || [] // Convert ObjectId[] to string[]
    };

    if (!canDeleteAudio(audioFile, userContext)) { // Using same permissions as delete for modify
      return NextResponse.json(
        { success: false, message: "Insufficient permissions to modify this audio file" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, lecturerName, type, tags, year, visibility, sharedWith, broadcastReady } = body;

    // Update the recording
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (lecturerName !== undefined) updateData.lecturerName = lecturerName;
    if (type !== undefined) updateData.type = type;
    if (tags !== undefined) updateData.tags = tags;
    if (year !== undefined) updateData.year = year;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (sharedWith !== undefined) updateData.sharedWith = sharedWith;
    if (broadcastReady !== undefined) updateData.broadcastReady = broadcastReady;

    const updatedRecording = await AudioRecording.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('lecturer', 'name').populate('category', 'name');

    return NextResponse.json({
      success: true,
      message: "Audio recording updated successfully",
      recording: updatedRecording
    });

  } catch (error) {
    console.error("Error updating audio recording:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}