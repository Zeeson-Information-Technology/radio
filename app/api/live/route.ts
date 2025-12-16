import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";

/**
 * Public Live State API
 * GET /api/live
 * 
 * Returns current live stream status and metadata
 * No authentication required - public endpoint
 */
export async function GET() {
  try {
    // Reduced logging for performance
    await connectDB();
    let liveState = await LiveState.findOne().lean();

    // If no LiveState exists, create a default one
    if (!liveState) {
      liveState = new LiveState({
        isLive: false,
        isMuted: false,
        mount: "/stream",
        title: undefined,
        lecturer: undefined,
        startedAt: null,
        updatedAt: new Date()
      });
      await liveState.save();
    }

    // Get stream URL from environment
    const streamUrl = process.env.STREAM_URL || "http://98.93.42.61:8000/stream";

    // Return public live state
    const response = {
      ok: true,
      isLive: liveState.isLive || false,
      isMuted: liveState.isMuted || false,
      title: liveState.title || null,
      lecturer: liveState.lecturer || null,
      startedAt: liveState.startedAt ? liveState.startedAt.toISOString() : null,
      streamUrl,
    };
    
    // Create response with cache headers for faster subsequent requests
    const jsonResponse = NextResponse.json(response);
    jsonResponse.headers.set('Cache-Control', 'no-cache, must-revalidate');
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return jsonResponse;
  } catch (error) {
    console.error("Live state API error:", error);
    console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
    
    // Return fallback state on error
    const fallbackResponse = NextResponse.json(
      {
        ok: true, // Changed to true so UI doesn't break
        isLive: false,
        isMuted: false,
        title: null,
        lecturer: null,
        startedAt: null,
        streamUrl: process.env.STREAM_URL || "http://98.93.42.61:8000/stream",
      }
    );
    
    fallbackResponse.headers.set('Cache-Control', 'no-cache, must-revalidate');
    return fallbackResponse;
  }
}
