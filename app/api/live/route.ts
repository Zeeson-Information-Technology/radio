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
    // Connect to database
    await connectDB();

    // Find the single LiveState document
    let liveState = await LiveState.findOne();

    // If no LiveState exists, create a default one
    if (!liveState) {
      liveState = await LiveState.create({
        isLive: false,
        isPaused: false,
        mount: "/stream",
        title: null,
        lecturer: null,
        startedAt: null,
        pausedAt: null,
        updatedAt: new Date()
      });
    }

    // Get stream URL from environment
    const streamUrl = process.env.STREAM_URL || "http://98.93.42.61:8000/stream";

    // Return public live state
    return NextResponse.json({
      ok: true,
      isLive: liveState.isLive || false,
      isPaused: liveState.isPaused || false,
      title: liveState.title || null,
      lecturer: liveState.lecturer || null,
      startedAt: liveState.startedAt ? liveState.startedAt.toISOString() : null,
      pausedAt: liveState.pausedAt ? liveState.pausedAt.toISOString() : null,
      streamUrl,
    });
  } catch (error) {
    console.error("Live state API error:", error);
    console.error("Error details:", error.message);
    
    // Return fallback state on error
    return NextResponse.json(
      {
        ok: true, // Changed to true so UI doesn't break
        isLive: false,
        isPaused: false,
        title: null,
        lecturer: null,
        startedAt: null,
        pausedAt: null,
        streamUrl: process.env.STREAM_URL || "http://98.93.42.61:8000/stream",
      }
    );
  }
}
