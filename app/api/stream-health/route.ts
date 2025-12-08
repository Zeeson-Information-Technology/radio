import { NextResponse } from "next/server";
import { getStreamUrl } from "@/lib/config";

/**
 * Stream Health Check API
 * GET /api/stream-health
 * 
 * Diagnostic endpoint to check if the configured stream URL is reachable
 * No authentication required - for admin testing only
 */
export async function GET() {
  try {
    const streamUrl = getStreamUrl();
    
    // Check if using placeholder URL
    if (streamUrl === "https://example.com/stream") {
      return NextResponse.json({
        ok: true,
        reachable: false,
        configured: false,
        message: "Stream URL not configured. Using placeholder.",
        url: streamUrl,
      });
    }

    // Attempt to reach the stream URL
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(streamUrl, {
        method: 'HEAD',
        signal: controller.signal,
        // Don't follow redirects for health check
        redirect: 'manual',
      });

      clearTimeout(timeoutId);

      // Consider 2xx, 3xx, and some 4xx as "reachable"
      // Icecast might return 404 if stream is not live, but server is up
      const reachable = response.status < 500;

      return NextResponse.json({
        ok: true,
        reachable,
        configured: true,
        status: response.status,
        statusText: response.statusText,
        url: streamUrl,
        message: reachable 
          ? "Stream server is reachable" 
          : "Stream server returned error",
      });
    } catch (fetchError) {
      // Network error, timeout, or CORS issue
      const errorMessage = fetchError instanceof Error 
        ? fetchError.message 
        : "Unknown error";

      return NextResponse.json({
        ok: true,
        reachable: false,
        configured: true,
        url: streamUrl,
        error: errorMessage,
        message: "Cannot reach stream server. Check URL and network connectivity.",
      });
    }
  } catch (error) {
    console.error("Stream health check error:", error);
    
    return NextResponse.json(
      {
        ok: false,
        error: "Health check failed",
        message: "An error occurred during health check",
      },
      { status: 500 }
    );
  }
}
