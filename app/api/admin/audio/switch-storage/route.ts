import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";

/**
 * POST /api/admin/audio/switch-storage
 * Switch preferred storage for all audio files (DigitalOcean <-> Cloudinary)
 * Only super_admin can perform this operation
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const admin = await getCurrentAdmin();
    if (!admin || admin.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Only super administrators can switch storage" },
        { status: 403 }
      );
    }

    await connectDB();

    const { preferredStorage, filter } = await request.json();

    // Validate input
    if (!["digitalocean", "cloudinary"].includes(preferredStorage)) {
      return NextResponse.json(
        { success: false, message: "Invalid storage option. Must be 'digitalocean' or 'cloudinary'" },
        { status: 400 }
      );
    }

    // Build query based on filter
    let query: any = {};
    
    if (filter === "with-cloudinary") {
      // Only update files that have Cloudinary URLs
      query = { cloudinaryUrl: { $exists: true, $ne: null } };
    } else if (filter === "all") {
      // Update all files
      query = {};
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid filter. Must be 'with-cloudinary' or 'all'" },
        { status: 400 }
      );
    }

    // Update all matching records
    const result = await AudioRecording.updateMany(
      query,
      { preferredStorage },
      { multi: true }
    );

    console.log(`🔄 Storage preference switched:`, {
      preferredStorage,
      filter,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} audio files to use ${preferredStorage}`,
      data: {
        preferredStorage,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error("Storage switch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to switch storage" },
      { status: 500 }
    );
  }
}
