import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import Lecturer from "@/lib/models/Lecturer";
import Tag from "@/lib/models/Tag";
import mongoose from "mongoose";

/**
 * PATCH /api/audio/recordings/[id]
 * Update audio recording metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only super_admin and admin can edit recordings
    if (admin.role !== "super_admin" && admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Connect to database
    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid recording ID" },
        { status: 400 }
      );
    }

    // Parse request body
    const updateData = await request.json();
    const { title, description, lecturerName, type, tags, year } = updateData;

    // Validate required fields
    if (!title?.trim() || !lecturerName?.trim()) {
      return NextResponse.json(
        { success: false, message: "Title and lecturer name are required" },
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

    // Find or create lecturer if name changed
    let lecturer = null;
    if (lecturerName.trim() !== recording.lecturerName) {
      lecturer = await Lecturer.findOrCreate(lecturerName.trim(), admin._id);
    }

    // Process tags
    const processedTags = tags ? await Tag.processTags(tags.join(', '), admin._id) : [];

    // Update the recording
    const updatedRecording = await AudioRecording.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        description: description?.trim() || undefined,
        ...(lecturer && {
          lecturer: lecturer._id,
          lecturerName: lecturer.name
        }),
        type,
        tags: processedTags,
        year: year ? parseInt(year) : undefined,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    // Update lecturer statistics if lecturer changed
    if (lecturer) {
      await (lecturer as any).updateStatistics();
      
      // Update old lecturer statistics
      const oldLecturer = await Lecturer.findById(recording.lecturer);
      if (oldLecturer) {
        await (oldLecturer as any).updateStatistics();
      }
    }

    return NextResponse.json({
      success: true,
      message: "Recording updated successfully",
      recording: updatedRecording
    });

  } catch (error) {
    console.error("Error updating recording:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/audio/recordings/[id]
 * Delete audio recording
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only super_admin and admin can delete recordings
    if (admin.role !== "super_admin" && admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Connect to database
    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid recording ID" },
        { status: 400 }
      );
    }

    // Find and delete the recording
    const recording = await AudioRecording.findById(id);
    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Recording not found" },
        { status: 404 }
      );
    }

    // Delete the recording
    await AudioRecording.findByIdAndDelete(id);

    // Update related statistics
    const lecturer = await Lecturer.findById(recording.lecturer);
    if (lecturer) {
      await (lecturer as any).updateStatistics();
    }

    return NextResponse.json({
      success: true,
      message: "Recording deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting recording:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}