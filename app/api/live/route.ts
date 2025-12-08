import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";
import { config } from "@/lib/config";

/**
 * Public Live State API
 * GET /api/live
 * 
 * Returns current live stream status and metadata
 * No authentication required - public endpoint
 */
export async function GET() {
  try {
    // Connect to database
    await connectDB();

    // Find the single LiveState document
    let liveState = await LiveState.findOne();

    // If no LiveState exists, create a default one
    if (!liveState) {
      liveState = await LiveState.create({
        isLive: false,
        mount: "/stream",
        title: "Offline",
        lecturer: "",
        startedAt: null,
      });
    }

    // Get stream URL from environment
    const streamUrl = config.streamUrl || "https://example.com/stream";

    // Return public live state
    return NextResponse.json({
      ok: true,
      isLive: liveState.isLive,
      title: liveState.title || null,
      lecturer: liveState.lecturer || null,
      startedAt: liveState.startedAt ? liveState.startedAt.toISOString() : null,
      streamUrl,
    });
  } catch (error) {
    console.error("Live state API error:", error);
    
    // Return fallback state on error
    return NextResponse.json(
      {
        ok: false,
        isLive: false,
        title: "Service Unavailable",
        lecturer: null,
        startedAt: null,
        streamUrl: config.streamUrl || "https://example.com/stream",
        error: "Unable to fetch live state",
      },
      { status: 500 }
    );
  }
}
