import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getFormatByExtension } from "@/lib/utils/audio-formats";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "lon1",
  endpoint: process.env.AWS_ENDPOINT || "https://lon1.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "almanhaj-radio";
const REGION = process.env.AWS_REGION || "lon1";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!["super_admin", "admin", "presenter"].includes(admin.role)) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, contentType, fileSize } = body;

    if (!fileName || !contentType) {
      return NextResponse.json({ success: false, message: "fileName and contentType are required" }, { status: 400 });
    }

    // Validate file extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const formatInfo = getFormatByExtension(ext);
    if (!formatInfo) {
      return NextResponse.json({ success: false, message: `Unsupported file format: .${ext}` }, { status: 400 });
    }

    // Validate file size (100MB max for direct upload)
    const maxSize = 100 * 1024 * 1024;
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json({
        success: false,
        message: `File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum is 100MB.`
      }, { status: 400 });
    }

    // Generate storage key
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const storageKey = `originals/${year}/${month}/${timestamp}-${sanitized}`;

    // Generate presigned PUT URL (expires in 15 minutes)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
      ContentType: contentType,
      ACL: "public-read",
      CacheControl: "max-age=31536000",
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    const storageUrl = `https://${BUCKET_NAME}.${REGION}.digitaloceanspaces.com/${storageKey}`;
    const cdnUrl = `https://${BUCKET_NAME}.${REGION}.cdn.digitaloceanspaces.com/${storageKey}`;

    return NextResponse.json({
      success: true,
      presignedUrl,
      storageKey,
      storageUrl,
      cdnUrl,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ success: false, message: "Failed to generate upload URL" }, { status: 500 });
  }
}
