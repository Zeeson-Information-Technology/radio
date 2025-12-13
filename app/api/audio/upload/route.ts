import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import Lecturer from "@/lib/models/Lecturer";
import Category from "@/lib/models/Category";
import Tag from "@/lib/models/Tag";
import { S3Service, extractAudioMetadata } from "@/lib/services/s3";
import AudioConversionService from "@/lib/services/audioConversion";
import { getSupportedMimeTypes, getFormatByExtension, SUPPORTED_AUDIO_FORMATS } from "@/lib/utils/audio-formats";

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

    // Only super_admin and admin can upload audio files
    if (admin.role !== "super_admin" && admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions. Only administrators can upload audio files." },
        { status: 403 }
      );
    }

    // Connect to database
    await connectDB();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const lecturerName = formData.get("lecturerName") as string;
    const categoryName = formData.get("category") as string;
    const type = formData.get("type") as string;
    const tags = formData.get("tags") as string;
    const year = formData.get("year") as string;

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

    // Find or create category (default to "lecture" if not specified)
    let category;
    if (categoryName && categoryName.trim()) {
      category = await Category.findOne({ name: categoryName.trim() });
    }
    if (!category) {
      // Use default category based on type
      const defaultCategoryNames = {
        quran: "Quran Recitation",
        hadith: "Hadith",
        tafsir: "Tafsir",
        lecture: "Islamic Lectures",
        dua: "Dua & Dhikr"
      };
      const defaultName = defaultCategoryNames[type as keyof typeof defaultCategoryNames] || "Islamic Lectures";
      category = await Category.findOne({ name: defaultName });
    }

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 400 }
      );
    }

    // Process tags
    const processedTags = tags ? await Tag.processTags(tags, admin._id) : [];

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
      
      accessLevel: "public",
      createdBy: admin._id,
      status: "active", // File successfully uploaded to S3
      isPublic: true
    });

    await audioRecording.save();

    // Trigger conversion if needed
    if (needsConversion) {
      console.log(`🎵 Triggering conversion for ${detectedFormat} file:`, audioRecording._id);
      await conversionService.addConversionJob(audioRecording._id.toString(), uploadResult.storageUrl);
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
      fileSize: uploadResult.fileSize
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}