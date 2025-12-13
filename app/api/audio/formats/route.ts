import { NextResponse } from "next/server";
import { SUPPORTED_AUDIO_FORMATS, getSupportedMimeTypes, getRecommendedFormats } from "@/lib/utils/audio-formats";

/**
 * GET /api/audio/formats
 * Returns information about supported audio formats
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        supportedFormats: SUPPORTED_AUDIO_FORMATS,
        supportedMimeTypes: getSupportedMimeTypes(),
        recommendations: {
          lectures: getRecommendedFormats('lecture'),
          quran: getRecommendedFormats('quran'),
          voice: getRecommendedFormats('voice'),
          archival: getRecommendedFormats('archival'),
          streaming: getRecommendedFormats('streaming'),
          mobile: getRecommendedFormats('mobile')
        }
      }
    });
  } catch (error) {
    console.error("Error fetching audio formats:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}