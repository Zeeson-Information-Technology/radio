import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";

/**
 * GET /api/audio/public
 * Returns public audio recordings with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Filters
    const type = searchParams.get("type");
    const lecturer = searchParams.get("lecturer");
    const category = searchParams.get("category");
    const year = searchParams.get("year");
    const search = searchParams.get("search");
    const format = searchParams.get("format");

    // Build query
    const query: any = {
      status: "active",
      isPublic: true,
      accessLevel: "public"
    };

    if (type) query.type = type;
    if (lecturer) query.lecturerName = new RegExp(lecturer, "i");
    if (category) query.category = category;
    if (year) query.year = parseInt(year);
    if (format) query.format = format;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Sort options
    const sortBy = searchParams.get("sortBy") || "uploadDate";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const sort: any = {};
    
    if (search && query.$text) {
      sort.score = { $meta: "textScore" };
    } else {
      sort[sortBy] = sortOrder;
    }

    // Debug: Log the query being executed
    console.log("🔍 Public API Query:", JSON.stringify(query, null, 2));
    console.log("🔍 Sort:", sort);
    console.log("🔍 Skip:", skip, "Limit:", limit);

    // Execute query
    const [recordings, total] = await Promise.all([
      AudioRecording.find(query)
        .select({
          title: 1,
          description: 1,
          lecturerName: 1,
          type: 1,
          tags: 1,
          year: 1,
          duration: 1,
          format: 1,
          fileSize: 1,
          uploadDate: 1,
          playCount: 1,
          cdnUrl: 1,
          storageUrl: 1
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      AudioRecording.countDocuments(query)
    ]);

    console.log("📊 Public API Results:", {
      recordingsFound: recordings.length,
      totalCount: total,
      sampleRecording: recordings[0] ? {
        title: recordings[0].title,
        status: recordings[0].status,
        isPublic: recordings[0].isPublic,
        accessLevel: recordings[0].accessLevel
      } : null
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        recordings,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecordings: total,
          recordingsPerPage: limit,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error("Error fetching public audio recordings:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}