import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import Lecturer from "@/lib/models/Lecturer";
import Category from "@/lib/models/Category";
import { deleteAudioFromS3 } from "@/lib/services/s3";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "uploadDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query
    const query: any = {};

    // Search across title, lecturer name, and tags
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { lecturerName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }

    // Filter by type
    if (type && type !== "all") {
      query.type = type;
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [recordings, totalCount] = await Promise.all([
      AudioRecording.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("lecturer", "name arabicName")
        .populate("category", "name arabicName icon color")
        .lean(),
      AudioRecording.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      recordings,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit
      }
    });

  } catch (error) {
    console.error("Error fetching recordings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get recording ID from query params
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get("id");

    if (!recordingId) {
      return NextResponse.json(
        { success: false, message: "Recording ID is required" },
        { status: 400 }
      );
    }

    // Find and delete the recording
    const recording = await AudioRecording.findById(recordingId);
    if (!recording) {
      return NextResponse.json(
        { success: false, message: "Recording not found" },
        { status: 404 }
      );
    }

    // Delete file from S3 storage
    try {
      await deleteAudioFromS3(recording.storageKey);
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      // Continue with database deletion even if S3 deletion fails
    }
    
    await AudioRecording.findByIdAndDelete(recordingId);

    // Update related statistics
    const lecturer = await Lecturer.findById(recording.lecturer);
    if (lecturer) {
      await (lecturer as any).updateStatistics();
    }

    const category = await Category.findById(recording.category);
    if (category) {
      await (category as any).updateRecordingCount();
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