import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { getFormatByExtension } from "@/lib/utils/audio-formats";
import crypto from "crypto";

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

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const formatInfo = getFormatByExtension(ext);
    if (!formatInfo) {
      return NextResponse.json({ success: false, message: `Unsupported file format: .${ext}` }, { status: 400 });
    }

    const maxSize = 100 * 1024 * 1024;
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json({
        success: false,
        message: `File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum is 100MB.`
      }, { status: 400 });
    }

    // Generate Cloudinary public ID
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[^/.]+$/, "");
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const publicId = `almanhaj-radio/${year}/${month}/${timestamp}-${sanitized}`;

    // Generate Cloudinary signed upload params
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
    const apiKey = process.env.CLOUDINARY_API_KEY || "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ success: false, message: "Cloudinary not configured" }, { status: 500 });
    }

    const cloudTimestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `public_id=${publicId}&timestamp=${cloudTimestamp}`;
    const signature = crypto.createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      uploadParams: {
        public_id: publicId,
        timestamp: cloudTimestamp,
        api_key: apiKey,
        signature,
      },
      storageKey: publicId,
      storageUrl: "",
      cdnUrl: "",
    });
  } catch (error) {
    console.error("Error generating Cloudinary upload params:", error);
    return NextResponse.json({ success: false, message: "Failed to generate upload URL" }, { status: 500 });
  }
}
