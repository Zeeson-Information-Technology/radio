import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import AdminUser from "@/lib/models/AdminUser";
import Category from "@/lib/models/Category";
import Tag from "@/lib/models/Tag";
import { getFormatByExtension } from "@/lib/utils/audio-formats";
import { getGatewayUrl, checkGatewayHealth } from "@/lib/utils/environment-checker";
import jwt from "jsonwebtoken";

function getDefaultVisibility(role: string, isBroadcastUpload: boolean = false): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'public';
    case 'presenter':
      return isBroadcastUpload ? 'shared' : 'private';
    default:
      return 'private';
  }
}

function estimateDuration(fileName: string, fileSize: number): number {
  const fileSizeMB = fileSize / (1024 * 1024);
  const ext = fileName.toLowerCase();
  if (ext.endsWith('.mp3')) return Math.round(fileSizeMB * 60);
  if (ext.endsWith('.m4a') || ext.endsWith('.aac')) return Math.round(fileSizeMB * 80);
  if (ext.endsWith('.wav')) return Math.round(fileSizeMB * 6);
  if (ext.endsWith('.amr')) return Math.round(fileSizeMB * 120);
  return Math.round(fileSizeMB * 60);
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      storageKey, storageUrl, cdnUrl, fileSize, fileName, contentType,
      title, description, lecturerName, type, tags, year,
      visibility: visibilityInput, sharedWith, broadcastReady, preferredStorage,
    } = body;

    if (!storageKey || !storageUrl || !title || !fileName) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const formatInfo = getFormatByExtension(ext);
    const detectedFormat = formatInfo?.extension || ext;
    const CONVERSION_FORMATS = ['amr', 'amr-wb', '3gp', '3gp2', 'wma', 'mpeg'];
    const needsConversion = CONVERSION_FORMATS.includes(detectedFormat.toLowerCase());
    const isBroadcastUpload = broadcastReady === true;
    const visibility = visibilityInput || getDefaultVisibility(admin.role, isBroadcastUpload);
    const estimatedDuration = estimateDuration(fileName, fileSize || 0);

    // Find or create category
    const defaultCategoryNames: Record<string, string> = {
      quran: "Quran Recitation", hadith: "Hadith", tafsir: "Tafsir",
      lecture: "Islamic Lectures", adhkar: "Adhkar & Dhikr", qa: "Islamic Lectures",
    };
    const defaultName = defaultCategoryNames[type] || "Islamic Lectures";
    let category = await Category.findOne({ name: defaultName });
    if (!category) {
      await Category.createDefaults();
      category = await Category.findOne({ name: defaultName });
      if (!category) {
        return NextResponse.json({ success: false, message: `Category not found: ${defaultName}` }, { status: 500 });
      }
    }

    const processedTags = tags ? await Tag.processTags(tags, admin._id) : [];

    let sharedWithIds: string[] = [];
    if (visibility === 'shared' && sharedWith) {
      try {
        const ids = JSON.parse(sharedWith);
        if (Array.isArray(ids)) {
          const valid = await AdminUser.find({
            _id: { $in: ids },
            role: { $in: ['presenter', 'admin', 'super_admin'] },
            status: 'active',
          }).select('_id');
          sharedWithIds = valid.map((p: any) => p._id.toString());
        }
      } catch (_) {}
    }

    const audioRecording = new AudioRecording({
      title: title.trim(),
      description: description?.trim() || undefined,
      lecturer: admin._id,
      lecturerName: lecturerName || admin.name,
      category: category._id,
      type,
      tags: processedTags,
      year: year ? parseInt(year) : undefined,
      fileName,
      originalFileName: fileName,
      fileSize: fileSize || 0,
      duration: estimatedDuration,
      format: detectedFormat,
      storageKey,
      storageUrl,
      cdnUrl,
      cloudinaryUrl: undefined,
      cloudinaryPublicId: undefined,
      preferredStorage: 'digitalocean' as const,
      originalUrl: storageUrl,
      originalFormat: detectedFormat,
      playbackFormat: needsConversion ? 'mp3' : detectedFormat,
      conversionStatus: needsConversion ? 'pending' : 'ready',
      playbackUrl: needsConversion ? undefined : storageUrl,
      visibility: visibility as 'private' | 'shared' | 'public',
      sharedWith: sharedWithIds,
      broadcastReady: broadcastReady || false,
      accessLevel: "public",
      createdBy: admin._id,
      status: "active",
      isPublic: true,
    });

    await audioRecording.save();

    // Trigger conversion if needed
    if (needsConversion) {
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
          const gatewayToken = jwt.sign(
            {
              userId: admin._id.toString(),
              email: admin.email,
              role: admin.role,
              type: 'conversion',
              iat: Math.floor(Date.now() / 1000),
            },
            jwtSecret,
            { expiresIn: '1h', issuer: 'almanhaj-radio', audience: 'broadcast-gateway' }
          );
          const gatewayUrl = getGatewayUrl();
          const health = await checkGatewayHealth();
          if (health.accessible) {
            await fetch(`${gatewayUrl}/api/convert-audio`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gatewayToken}`,
              },
              body: JSON.stringify({
                recordId: audioRecording._id.toString(),
                originalKey: storageKey,
                format: detectedFormat,
              }),
            });
          }
        }
      } catch (e) {
        console.error('Conversion trigger failed:', e);
      }
    }

    // Update category recording count
    await (category as any).updateRecordingCount();

    // Update tag usage counts
    for (const tagName of processedTags) {
      const tag = await Tag.findOne({ name: tagName });
      if (tag) await (tag as any).updateUsageCount();
    }

    return NextResponse.json({
      success: true,
      message: needsConversion
        ? "Audio uploaded successfully. Converting to MP3 for web playback..."
        : "Audio uploaded successfully",
      recordingId: audioRecording._id,
      status: "active",
      conversionStatus: audioRecording.conversionStatus,
      format: audioRecording.format,
      playbackFormat: audioRecording.playbackFormat,
      needsConversion,
      duration: estimatedDuration,
      fileSize: fileSize || 0,
      visibility: audioRecording.visibility,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Complete upload error:", msg);
    if (stack) console.error("Stack:", stack);
    return NextResponse.json({ success: false, message: msg || "Internal server error" }, { status: 500 });
  }
}
