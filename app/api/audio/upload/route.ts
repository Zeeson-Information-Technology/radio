import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import AdminUser from "@/lib/models/AdminUser";
import Lecturer from "@/lib/models/Lecturer";
import Category from "@/lib/models/Category";
import Tag from "@/lib/models/Tag";
import { S3Service, extractAudioMetadata } from "@/lib/services/s3";
import AudioConversionService from "@/lib/services/audioConversion";
import { getSupportedMimeTypes, getFormatByExtension, SUPPORTED_AUDIO_FORMATS } from "@/lib/utils/audio-formats";
import jwt from "jsonwebtoken";

/**
 * Get default visibility based on user role (Requirements 8.1, 8.2)
 */
function getDefaultVisibility(role: string, isBroadcastUpload: boolean = false): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'public'; // Admins default to public for station-wide access
    case 'presenter':
      return isBroadcastUpload ? 'shared' : 'private'; // Presenters default to shared for broadcast uploads, private otherwise
    default:
      return 'private';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Parse form data
    const formData = await request.formData();
    
    // Check if this is a broadcast-ready upload by a presenter
    const isBroadcastUpload = formData.get("broadcastReady") === "true";
    
    // Only super_admin and admin can upload regular audio files
    // Presenters can only upload broadcast-ready audio for live injection
    if (admin.role !== "super_admin" && admin.role !== "admin" && admin.role !== "presenter") {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions. Only administrators and presenters can upload audio files." },
        { status: 403 }
      );
    }
    
    // Presenters can only upload broadcast-ready audio
    if (admin.role === "presenter" && !isBroadcastUpload) {
      return NextResponse.json(
        { success: false, message: "Presenters can only upload audio marked as broadcast-ready for live injection." },
        { status: 403 }
      );
    }
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const lecturerName = formData.get("lecturerName") as string;

    const type = formData.get("type") as string;
    const tags = formData.get("tags") as string;
    const year = formData.get("year") as string;
    
    // New access control fields (Requirements 7.1, 7.2, 8.1, 8.2)
    const visibility = formData.get("visibility") as string || getDefaultVisibility(admin.role, isBroadcastUpload);
    const sharedWith = formData.get("sharedWith") as string; // JSON array of presenter IDs
    const broadcastReady = formData.get("broadcastReady") === "true";

    // Validate required fields
    if (!file || !title || !lecturerName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: file, title, and lecturerName" },
        { status: 400 }
      );
    }

    // Validate file type - prioritize file extension over MIME type for better compatibility
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const formatInfo = getFormatByExtension(fileExtension || '');
    const supportedMimeTypes = getSupportedMimeTypes();
    
    // Check if extension is supported
    if (!fileExtension || !formatInfo) {
      const supportedExtensions = Object.keys(SUPPORTED_AUDIO_FORMATS).join(', ').toUpperCase();
      return NextResponse.json(
        { 
          success: false, 
          message: `Unsupported file extension: .${fileExtension || 'unknown'}. Supported formats: ${supportedExtensions}` 
        },
        { status: 400 }
      );
    }

    // For certain formats (like AMR), MIME type might be empty or unrecognized
    // Accept if either MIME type is valid OR extension is valid
    const hasValidMimeType = file.type && supportedMimeTypes.includes(file.type);
    const hasValidExtension = formatInfo !== null;
    
    if (!hasValidMimeType && !hasValidExtension) {
      const supportedExtensions = Object.keys(SUPPORTED_AUDIO_FORMATS).join(', ').toUpperCase();
      return NextResponse.json(
        { 
          success: false, 
          message: `Unsupported file format: ${file.type || 'unknown MIME type'}. Supported formats: ${supportedExtensions}` 
        },
        { status: 400 }
      );
    }

    // Validate file size (20MB max for better usability)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { 
          success: false, 
          message: `File too large (${sizeMB}MB). Maximum size is 20MB. Please compress your audio file or use MP3/M4A format for better compression.` 
        },
        { status: 400 }
      );
    }

    // Use detected format from file extension
    let detectedFormat = formatInfo?.extension || fileExtension;
    
    // Initialize services
    const s3Service = S3Service.getInstance();
    const conversionService = AudioConversionService.getInstance();
    
    // Determine if file needs conversion
    const needsConversion = AudioConversionService.needsConversion(detectedFormat);
    
    // Upload original file to S3
    const originalKey = s3Service.generateOriginalKey(file.name);
    const uploadResult = await s3Service.uploadFromFile(file, originalKey, file.type);
    
    // Extract audio metadata (duration, etc.)
    console.log("🎵 Extracting audio metadata for:", file.name);
    const audioMetadata = await extractAudioMetadata(file);
    console.log("🎵 Extracted metadata:", audioMetadata);

    // Find or create lecturer
    const lecturer = await Lecturer.findOrCreate(lecturerName.trim(), admin._id);

    // Find or create default category based on type
    const defaultCategoryNames = {
      quran: "Quran Recitation",
      hadith: "Hadith",
      tafsir: "Tafsir",
      lecture: "Islamic Lectures",
      adhkar: "Adhkar & Dhikr",
      qa: "Islamic Lectures" // Q&A sessions are categorized as lectures
    };
    const defaultName = defaultCategoryNames[type as keyof typeof defaultCategoryNames] || "Islamic Lectures";
    
    let category = await Category.findOne({ name: defaultName });
    
    if (!category) {
      // Create default categories if they don't exist
      await Category.createDefaults();
      category = await Category.findOne({ name: defaultName });
      
      if (!category) {
        return NextResponse.json(
          { success: false, message: `Category "${defaultName}" could not be created` },
          { status: 500 }
        );
      }
    }

    // Process tags
    const processedTags = tags ? await Tag.processTags(tags, admin._id) : [];

    // Process shared presenters for shared visibility (Requirements 7.2)
    let sharedWithIds: string[] = [];
    if (visibility === 'shared' && sharedWith) {
      try {
        const presenterIds = JSON.parse(sharedWith);
        if (Array.isArray(presenterIds)) {
          // Validate presenter IDs exist and are active
          const validPresenters = await AdminUser.find({
            _id: { $in: presenterIds },
            role: { $in: ['presenter', 'admin', 'super_admin'] },
            status: 'active'
          }).select('_id');
          sharedWithIds = validPresenters.map(p => p._id.toString());
        }
      } catch (error) {
        console.warn('Invalid sharedWith format:', error);
      }
    }

    // Create audio recording with conversion support
    const audioRecording = new AudioRecording({
      title: title.trim(),
      description: description?.trim() || undefined,
      lecturer: lecturer._id,
      lecturerName: lecturer.name,
      category: category._id,
      type: type as any,
      tags: processedTags,
      year: year ? parseInt(year) : undefined,
      fileName: file.name,
      originalFileName: file.name,
      fileSize: uploadResult.fileSize,
      duration: audioMetadata.duration,
      format: detectedFormat,
      bitrate: audioMetadata.bitrate,
      sampleRate: audioMetadata.sampleRate,
      storageKey: uploadResult.storageKey,
      storageUrl: uploadResult.storageUrl,
      cdnUrl: uploadResult.cdnUrl,
      
      // Conversion fields
      originalUrl: uploadResult.storageUrl,
      originalFormat: detectedFormat,
      playbackFormat: needsConversion ? 'mp3' : detectedFormat,
      conversionStatus: needsConversion ? 'pending' : 'ready',
      playbackUrl: needsConversion ? undefined : uploadResult.storageUrl,
      
      // Access control fields (Requirements 7.1, 7.2, 8.1, 8.2)
      visibility: visibility as 'private' | 'shared' | 'public',
      sharedWith: sharedWithIds,
      broadcastReady: broadcastReady,
      
      accessLevel: "public",
      createdBy: admin._id,
      status: "active", // File successfully uploaded to S3
      isPublic: true
    });

    await audioRecording.save();

    // Trigger conversion if needed
    if (needsConversion) {
      console.log(`🎵 Triggering conversion for ${detectedFormat} file:`, audioRecording._id);
      
      try {
        // Generate proper JWT token for gateway authentication
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('JWT_SECRET not configured');
        }

        const gatewayToken = jwt.sign(
          {
            userId: admin._id.toString(),
            email: admin.email,
            role: admin.role,
            type: 'conversion',
            iat: Math.floor(Date.now() / 1000),
          },
          jwtSecret,
          {
            expiresIn: '1h',
            issuer: 'almanhaj-radio',
            audience: 'broadcast-gateway'
          }
        );

        // Call EC2 gateway conversion service
        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
        const conversionResponse = await fetch(`${gatewayUrl}/api/convert-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gatewayToken}`
          },
          body: JSON.stringify({
            recordId: audioRecording._id.toString(),
            originalKey: uploadResult.storageKey,
            format: detectedFormat
          })
        });
        
        if (!conversionResponse.ok) {
          console.error('Gateway conversion request failed:', await conversionResponse.text());
          // Don't fail the upload, just log the error
        } else {
          const conversionResult = await conversionResponse.json();
          console.log('✅ Conversion job queued:', conversionResult.jobId);
        }
      } catch (error) {
        console.error('Failed to trigger conversion on gateway:', error);
        // Don't fail the upload, just log the error
      }
    }

    // Update lecturer statistics
    await (lecturer as any).updateStatistics();

    // Update category recording count
    await (category as any).updateRecordingCount();

    // Update tag usage counts
    for (const tagName of processedTags) {
      const tag = await Tag.findOne({ name: tagName });
      if (tag) {
        await (tag as any).updateUsageCount();
      }
    }

    return NextResponse.json({
      success: true,
      message: needsConversion 
        ? "Audio uploaded successfully. Conversion to MP3 in progress for web playback."
        : "Audio uploaded successfully",
      recordingId: audioRecording._id,
      status: "active",
      conversionStatus: audioRecording.conversionStatus,
      needsConversion,
      duration: audioMetadata.duration,
      fileSize: uploadResult.fileSize,
      visibility: audioRecording.visibility,
      sharedWith: audioRecording.sharedWith,
      broadcastReady: audioRecording.broadcastReady
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}