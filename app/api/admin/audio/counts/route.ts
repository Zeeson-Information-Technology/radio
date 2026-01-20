import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import AudioRecording, { AudioFavorite } from "@/lib/models/AudioRecording";

/**
 * GET /api/admin/audio/counts
 * Get counts for all audio sections
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectDB();
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const broadcastReady = searchParams.get('broadcastReady');

    // Build base query with filters
    const baseQuery: any = {
      status: 'active'
    };

    // Add search filter if provided
    if (search) {
      baseQuery.$text = { $search: search };
    }

    // Add category filter if provided
    if (category) {
      baseQuery.category = category;
    }

    // Add broadcast ready filter if provided
    if (broadcastReady === 'true') {
      baseQuery.broadcastReady = true;
    }

    // Get counts for each section in parallel
    const [myCount, sharedCount, stationCount, allCount] = await Promise.all([
      // My audio files
      AudioRecording.countDocuments({
        ...baseQuery,
        createdBy: admin._id
      }),

      // Shared with me
      AudioRecording.countDocuments({
        ...baseQuery,
        visibility: 'shared',
        sharedWith: admin._id,
        createdBy: { $ne: admin._id }
      }),

      // Station library (public)
      AudioRecording.countDocuments({
        ...baseQuery,
        visibility: 'public'
      }),

      // All accessible files
      (AudioRecording as any).getAccessibleFiles(admin._id.toString(), admin.role)
        .countDocuments(baseQuery)
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        all: allCount,
        my: myCount,
        shared: sharedCount,
        station: stationCount
      }
    });

  } catch (error) {
    console.error("Error fetching audio counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch audio counts" },
      { status: 500 }
    );
  }
}