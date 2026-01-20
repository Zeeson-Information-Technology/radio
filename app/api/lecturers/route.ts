import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lecturer from "@/lib/models/Lecturer";

/**
 * GET /api/lecturers
 * Returns list of lecturers sorted by recording count (most used first)
 * Used for lecturer dropdown in audio upload form
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get lecturers sorted by recording count (most used first)
    const lecturers = await Lecturer.find(
      { isActive: true },
      {
        name: 1,
        recordingCount: 1,
        isVerified: 1,
        _id: 1
      }
    )
    .sort({ recordingCount: -1, name: 1 }) // Most used first, then alphabetical
    .limit(100) // Reasonable limit for dropdown performance
    .lean();

    return NextResponse.json({
      success: true,
      lecturers: lecturers.map(lecturer => ({
        _id: lecturer._id.toString(),
        name: lecturer.name,
        recordingCount: lecturer.recordingCount || 0,
        isVerified: lecturer.isVerified || false
      }))
    });

  } catch (error) {
    console.error("Error fetching lecturers:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch lecturers",
        lecturers: [] // Fallback empty array for graceful degradation
      },
      { status: 500 }
    );
  }
}