import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import AudioRecording, { AudioFavorite } from "@/lib/models/AudioRecording";
import Lecturer from "@/lib/models/Lecturer";
import Category from "@/lib/models/Category";

/**
 * GET /api/admin/audio
 * Get audio files with access control for admin use (enhanced audio library)
 * Requirements: 7.3, 8.5, 8.6, 8.7
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'all'; // all, my, shared, station, favorites
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const broadcastReady = searchParams.get('broadcastReady');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let audioFiles: any[] = [];
    let totalCount = 0;

    // Build base query
    const baseQuery: any = {
      status: 'active'
      // Remove conversion status filter to show all files including converting ones
    };

    // Add search filter if provided (Requirements 7.8)
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

    switch (section) {
      case 'my':
        // User's own audio files
        baseQuery.createdBy = admin._id;
        audioFiles = await AudioRecording.find(baseQuery)
          .select('title description lecturerName category duration fileSize playbackUrl cdnUrl visibility sharedWith broadcastReady createdAt broadcastUsageCount conversionStatus conversionError')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();
        totalCount = await AudioRecording.countDocuments(baseQuery);
        break;

      case 'shared':
        // Files shared with this user
        baseQuery.visibility = 'shared';
        baseQuery.sharedWith = admin._id;
        baseQuery.createdBy = { $ne: admin._id }; // Exclude own files
        audioFiles = await AudioRecording.find(baseQuery)
          .select('title description lecturerName category duration fileSize playbackUrl cdnUrl createdBy broadcastReady createdAt broadcastUsageCount conversionStatus conversionError')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();
        totalCount = await AudioRecording.countDocuments(baseQuery);
        break;

      case 'station':
        // Public station library
        baseQuery.visibility = 'public';
        audioFiles = await AudioRecording.find(baseQuery)
          .select('title description lecturerName category duration fileSize playbackUrl cdnUrl createdBy broadcastReady createdAt broadcastUsageCount conversionStatus conversionError')
          .sort({ broadcastUsageCount: -1, createdAt: -1 }) // Sort by usage then date
          .limit(limit)
          .skip(offset)
          .lean();
        totalCount = await AudioRecording.countDocuments(baseQuery);
        break;

      case 'favorites':
        // User's favorite files (Requirements 7.7)
        const favorites = await AudioFavorite.find({ userId: admin._id })
          .populate({
            path: 'audioId',
            match: baseQuery,
            select: 'title description lecturerName category duration fileSize playbackUrl cdnUrl createdBy broadcastReady createdAt broadcastUsageCount conversionStatus conversionError'
          })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();
        
        audioFiles = favorites
          .filter(fav => fav.audioId) // Filter out null audioId (deleted files)
          .map(fav => ({
            ...fav.audioId,
            isFavorite: true,
            favoritedAt: fav.createdAt
          }));
        
        totalCount = await AudioFavorite.countDocuments({ 
          userId: admin._id,
          audioId: { $exists: true }
        });
        break;

      default:
        // All accessible files (Requirements 8.5, 8.6, 8.7)
        audioFiles = await (AudioRecording as any).getAccessibleFiles(admin._id.toString(), admin.role)
          .find(baseQuery)
          .select('title description lecturerName category duration fileSize playbackUrl cdnUrl visibility sharedWith createdBy broadcastReady createdAt broadcastUsageCount conversionStatus conversionError')
          .sort({ broadcastUsageCount: -1, createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();
        
        totalCount = await (AudioRecording as any).getAccessibleFiles(admin._id.toString(), admin.role)
          .countDocuments(baseQuery);
        break;
    }

    // Get user's favorites for marking
    const userFavorites = await AudioFavorite.find({ userId: admin._id })
      .select('audioId')
      .lean();
    const favoriteIds = new Set(userFavorites.map(fav => fav.audioId.toString()));

    // Format for audio injection system
    const formattedFiles = audioFiles.map(file => ({
      id: file._id.toString(),
      title: file.title,
      description: file.description,
      lecturerName: file.lecturerName,
      category: file.category,
      duration: file.duration,
      fileSize: file.fileSize,
      url: file.playbackUrl || file.cdnUrl || file.storageUrl,
      visibility: file.visibility,
      sharedWith: file.sharedWith || [],
      createdBy: file.createdBy,
      broadcastReady: file.broadcastReady,
      broadcastUsageCount: file.broadcastUsageCount || 0,
      createdAt: file.createdAt,
      isFavorite: favoriteIds.has(file._id.toString()),
      isOwner: file.createdBy && file.createdBy._id ? 
        file.createdBy._id.toString() === admin._id.toString() : 
        file.createdBy.toString() === admin._id.toString(),
      // Add conversion status information
      conversionStatus: file.conversionStatus || 'ready',
      conversionError: file.conversionError,
      isConverting: file.conversionStatus && ['pending', 'processing'].includes(file.conversionStatus),
      isPlayable: !file.conversionStatus || ['ready', 'completed'].includes(file.conversionStatus)
    }));

    return NextResponse.json({
      success: true,
      files: formattedFiles,
      count: formattedFiles.length,
      totalCount,
      section,
      hasMore: offset + formattedFiles.length < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount
      }
    });

  } catch (error) {
    console.error("Error fetching admin audio files:", error);
    return NextResponse.json(
      { error: "Failed to fetch audio files" },
      { status: 500 }
    );
  }
}