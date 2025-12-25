import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import Lecturer from "@/lib/models/Lecturer";
import Category from "@/lib/models/Category";

/**
 * GET /api/audio/public
 * Returns public audio recordings with pagination and filtering
 * This is the main public API for the audio library
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

    // Sort options
    const sortBy = searchParams.get("sortBy") || "uploadDate";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build query for public recordings
    const query: any = {
      status: "active",
      $and: [
        // Public visibility check
        {
          $or: [
            { visibility: "public" },
            { isPublic: true }
          ]
        },
        // Conversion status check
        {
          $or: [
            { conversionStatus: { $in: ["ready", "completed"] } },
            { conversionStatus: { $exists: false } } // For recordings without conversion status
          ]
        }
      ]
    };

    // Apply filters
    if (type && type !== "all") query.type = type;
    if (lecturer && lecturer !== "all") query.lecturerName = new RegExp(lecturer, "i");
    if (category && category !== "all") query.category = category;
    if (year) query.year = parseInt(year);
    if (format) query.format = format;

    // Text search across multiple fields
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { lecturerName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }

    // Build sort object
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
          lecturer: 1,
          category: 1,
          type: 1,
          tags: 1,
          year: 1,
          duration: 1,
          format: 1,
          fileSize: 1,
          uploadDate: 1,
          createdAt: 1,
          playCount: 1,
          cdnUrl: 1,
          storageUrl: 1,
          playbackUrl: 1,
          originalUrl: 1,
          fileName: 1,
          originalFileName: 1,
          conversionStatus: 1,
          playbackFormat: 1,
          originalFormat: 1
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
        lecturerName: recordings[0].lecturerName,
        category: recordings[0].category,
        hasPlaybackUrl: !!recordings[0].playbackUrl,
        hasCdnUrl: !!recordings[0].cdnUrl,
        hasStorageUrl: !!recordings[0].storageUrl
      } : null
    });

    // Process recordings to ensure they have playable URLs
    const processedRecordings = recordings.map(recording => {
      // Determine the best URL for playback
      const playableUrl = recording.playbackUrl || recording.cdnUrl || recording.storageUrl;
      
      return {
        ...recording,
        // Ensure we have a playable URL
        playableUrl,
        // Keep original URLs for compatibility
        url: playableUrl // AudioCard might expect this field
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      recordings: processedRecordings,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecordings: total, // Match what AudioLibrary expects
        recordingsPerPage: limit,
        hasNextPage,
        hasPrevPage
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