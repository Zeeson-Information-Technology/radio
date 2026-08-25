import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import AdminUser from "@/lib/models/AdminUser";
import Lecturer from "@/lib/models/Lecturer";
import Category from "@/lib/models/Category";
import Tag from "@/lib/models/Tag";
import { S3Service, extractAudioMetadata } from "@/lib/services/s3";
import { CloudinaryService } from "@/lib/services/cloudinary";
import AudioConversionService from "@/lib/services/audioConversion";
import { getSupportedMimeTypes, getFormatByExtension, SUPPORTED_AUDIO_FORMATS } from "@/lib/utils/audio-formats";
import { getGatewayUrl, logEnvironmentConfig, checkGatewayHealth } from "@/lib/utils/environment-checker";
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
    // Log environment configuration for debugging
    logEnvironmentConfig();
    
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
    const preferredStorage = (formData.get("preferredStorage") as string) || "digitalocean";

    // Log upload attempt for debugging
    console.log(`🎵 Upload attempt: ${file?.name} (${file?.size ? (file.size / (1024 * 1024)).toFixed(1) : 'unknown'}MB)`);

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

    // Validate file size (30MB max for better usability)
    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { 
          success: false, 
          message: `File too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB. Please compress your audio file or use MP3/M4A format for better compression.` 
        },
        { status: 400 }
      );
    }

    // Use detected format from file extension
    let detectedFormat = formatInfo?.extension || fileExtension;
    
    // Initialize services
    const s3Service = S3Service.getInstance();
    const cloudinaryService = CloudinaryService.getInstance();
    const conversionService = AudioConversionService.getInstance();
    
    // Determine if file needs conversion
    // AMR, 3GP, WMA not supported by browsers - convert to MP3 for web playback
    const needsConversion = AudioConversionService.needsConversion(detectedFormat);
    
    // Upload to both DigitalOcean Spaces (primary) and Cloudinary (secondary) in parallel
    console.log(`🎵 Starting parallel upload to both DigitalOcean Spaces and Cloudinary for: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
    
    let s3Result;
    let cloudinaryResult = null; // Disabled - free tier has 10MB limit, audio files are larger
    let uploadError;
    
    // Upload to DigitalOcean Spaces (primary storage)
    console.log(`🎵 Uploading to DigitalOcean Spaces (Cloudinary disabled - free tier 10MB limit)`);
    
    try {
      const originalKey = s3Service.generateOriginalKey(file.name);
      s3Result = await s3Service.uploadFromFile(file, originalKey, file.type);
      console.log(`✅ DigitalOcean Spaces upload completed: ${originalKey}`);
    } catch (error) {
      console.error(`❌ DigitalOcean Spaces upload failed:`, error);
      uploadError = error;
      throw error;
    }
    
    
    // Extract results
    if (!s3Result) {
      console.error('❌ DigitalOcean Spaces upload failed');
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to upload file to DigitalOcean Spaces. Please try again or contact support." 
        },
        { status: 500 }
      );
    }
    
    // Extract audio metadata (duration, etc.)
    console.log("🎵 Extracting audio metadata for:", file.name);
    const audioMetadata = await extractAudioMetadata(file);
    console.log("🎵 Extracted metadata:", audioMetadata);

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

    // Log what we're about to save
    console.log('📝 About to save AudioRecording with:', {
      storage: 'digitalocean-only',
      cloudinaryDisabled: 'free-tier-10mb-limit',
      preferredStorage: 'digitalocean',
      s3Result: !!s3Result
    });

    // Create audio recording with conversion support
    const audioRecording = new AudioRecording({
      title: title.trim(),
      description: description?.trim() || undefined,
      lecturer: admin._id,
      lecturerName: lecturerName || admin.name,
      category: category._id,
      type: type as any,
      tags: processedTags,
      year: year ? parseInt(year) : undefined,
      fileName: file.name,
      originalFileName: file.name,
      fileSize: s3Result.fileSize,
      duration: audioMetadata.duration,
      format: detectedFormat,
      bitrate: audioMetadata.bitrate,
      sampleRate: audioMetadata.sampleRate,
      
      // DigitalOcean Spaces (primary storage)
      storageKey: s3Result.storageKey,
      storageUrl: s3Result.storageUrl,
      cdnUrl: s3Result.cdnUrl,
      
      // Cloudinary disabled - free tier has 10MB limit for audio
      cloudinaryUrl: undefined,
      cloudinaryPublicId: undefined,
      preferredStorage: 'digitalocean' as const,
      
      // Conversion fields - convert AMR/3GP/WMA to MP3 for browser playback
      originalUrl: s3Result.storageUrl,
      originalFormat: detectedFormat,
      playbackFormat: needsConversion ? 'mp3' : detectedFormat,
      conversionStatus: needsConversion ? 'pending' : 'ready',
      playbackUrl: needsConversion ? undefined : s3Result.storageUrl,
      
      // Access control fields (Requirements 7.1, 7.2, 8.1, 8.2)
      visibility: visibility as 'private' | 'shared' | 'public',
      sharedWith: sharedWithIds,
      broadcastReady: broadcastReady,
      
      accessLevel: "public",
      createdBy: admin._id,
      status: "active", // File successfully uploaded to storage
      isPublic: true
    });

    await audioRecording.save();

    console.log('📝 Audio recording saved with:', {
      _id: audioRecording._id,
      format: audioRecording.format,
      playbackFormat: audioRecording.playbackFormat,
      originalFormat: audioRecording.originalFormat,
      conversionStatus: audioRecording.conversionStatus,
      needsConversion
    });

    // Trigger conversion if needed (AMR/3GP/WMA → MP3 for browser playback)
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

        // Call gateway conversion service
        const gatewayUrl = getGatewayUrl();
        console.log(`🔍 Using gateway URL: ${gatewayUrl}`);
        
        // Check if gateway is accessible before making the request
        const healthCheck = await checkGatewayHealth();
        if (!healthCheck.accessible) {
          console.error(`❌ Gateway not accessible: ${healthCheck.error}`);
          console.log('⚠️  Conversion will be skipped due to gateway unavailability - file will not be playable on browsers');
        } else {
          const conversionResponse = await fetch(`${gatewayUrl}/api/convert-audio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${gatewayToken}`
            },
            body: JSON.stringify({
              recordId: audioRecording._id.toString(),
              originalKey: s3Result.storageKey,
              format: detectedFormat
            })
          });
          
          if (!conversionResponse.ok) {
            const errorText = await conversionResponse.text();
            console.error('❌ Gateway conversion request failed:', errorText);
          } else {
            const conversionResult = await conversionResponse.json();
            console.log('✅ Conversion job queued:', conversionResult.jobId);
          }
        }
      } catch (error) {
        console.error('Failed to trigger conversion on gateway:', error);
      }
    }

    // Update lecturer statistics
    const lecturer = await AdminUser.findById(admin._id);
    if (lecturer) {
      await (lecturer as any).updateStatistics();
    }

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
        ? "Audio uploaded successfully. Converting to MP3 for web browser playback..."
        : "Audio uploaded successfully",
      recordingId: audioRecording._id,
      status: "active",
      conversionStatus: audioRecording.conversionStatus,
      format: audioRecording.format,
      playbackFormat: audioRecording.playbackFormat,
      needsConversion,
      duration: audioMetadata.duration,
      fileSize: s3Result.fileSize,
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