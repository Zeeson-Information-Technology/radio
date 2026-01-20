import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import AudioRecording from "@/lib/models/AudioRecording";

/**
 * GET /api/admin/conversion-status
 * Check conversion status of files that are currently converting
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication (Requirement 2.5)
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

    // Only allow admin and super_admin roles
    if (!['admin', 'super_admin'].includes(admin.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Parse query parameters for session optimization
    const { searchParams } = new URL(request.url);
    const sessionFilesParam = searchParams.get('sessionFiles');
    const sessionFiles = sessionFilesParam ? sessionFilesParam.split(',') : [];

    // Build query to check converting files AND recently completed files (Requirement 2.2)
    const baseQuery: any = {
      conversionStatus: { $in: ['pending', 'processing', 'ready', 'failed'] },
      status: 'active',
      // Only include recently updated files to avoid returning too many completed files
      $or: [
        { conversionStatus: { $in: ['pending', 'processing'] } }, // All converting files
        { 
          conversionStatus: { $in: ['ready', 'failed'] },
          updatedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Completed in last 5 minutes
        }
      ]
    };

    // Prioritize session files if provided (Requirement 4.2)
    let convertingFiles;
    if (sessionFiles.length > 0) {
      // First check session files
      const sessionQuery = {
        ...baseQuery,
        _id: { $in: sessionFiles }
      };
      
      const sessionConvertingFiles = await AudioRecording.find(sessionQuery)
        .select('_id title lecturerName conversionStatus playbackUrl conversionError lastConversionAttempt')
        .sort({ lastConversionAttempt: -1 })
        .lean();

      // Then check other converting files
      const otherQuery = {
        ...baseQuery,
        _id: { $nin: sessionFiles }
      };
      
      const otherConvertingFiles = await AudioRecording.find(otherQuery)
        .select('_id title lecturerName conversionStatus playbackUrl conversionError lastConversionAttempt')
        .sort({ lastConversionAttempt: -1 })
        .limit(20) // Limit other files to prevent large responses
        .lean();

      convertingFiles = [...sessionConvertingFiles, ...otherConvertingFiles];
    } else {
      // No session files, check all converting files
      convertingFiles = await AudioRecording.find(baseQuery)
        .select('_id title lecturerName conversionStatus playbackUrl conversionError lastConversionAttempt')
        .sort({ lastConversionAttempt: -1 })
        .limit(50) // Reasonable limit for performance
        .lean();
    }

    // Format response (Requirement 2.3)
    const updates = convertingFiles.map(file => ({
      recordId: file._id.toString(),
      title: file.title,
      lecturerName: file.lecturerName,
      conversionStatus: file.conversionStatus,
      playbackUrl: file.playbackUrl,
      conversionError: file.conversionError,
      isPlayable: file.conversionStatus === 'ready' && file.playbackUrl
    }));

    // Count completed and still processing
    const completedCount = updates.filter(update => 
      update.conversionStatus === 'ready'
    ).length;
    
    const failedCount = updates.filter(update => 
      update.conversionStatus === 'failed'
    ).length;
    
    const stillProcessing = updates.filter(update => 
      update.conversionStatus === 'pending' || update.conversionStatus === 'processing'
    ).length;

    console.log(`📊 Conversion status check: ${updates.length} files checked, ${completedCount} completed, ${failedCount} failed, ${stillProcessing} still processing`);

    return NextResponse.json({
      success: true,
      updates,
      completedCount,
      failedCount,
      stillProcessing,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error checking conversion status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check conversion status" },
      { status: 500 }
    );
  }
}