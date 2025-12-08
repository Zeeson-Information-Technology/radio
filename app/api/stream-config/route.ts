import { NextResponse } from "next/server";
import { getStreamConnectionDetails } from "@/lib/config";

/**
 * Stream Configuration API
 * GET /api/stream-config
 * 
 * Returns streaming connection details for admin/presenter use
 * No authentication required (no sensitive data exposed)
 */
export async function GET() {
  try {
    const details = getStreamConnectionDetails();

    return NextResponse.json(details);
  } catch (error) {
    console.error("Stream config API error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to fetch stream configuration",
        host: "Not configured",
        port: "Not configured",
        mount: "Not configured",
        format: "Not configured",
        isConfigured: false,
      },
      { status: 500 }
    );
  }
}
