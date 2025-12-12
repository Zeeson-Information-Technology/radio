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
    console.log("🔍 Live API: Starting request");
    
    // Connect to database
    console.log("🔍 Live API: Connecting to database...");
    await connectDB();
    console.log("✅ Live API: Database connected");

    // Find the single LiveState document with lean query for better performance
    console.log("🔍 Live API: Querying LiveState...");
    let liveState = await LiveState.findOne().lean();
    console.log("✅ Live API: LiveState query complete", liveState ? "Found document" : "No document found");
    
    // Debug: Log the actual database state
    if (liveState) {
      console.log("📊 Live API: Database state:", {
        isLive: liveState.isLive,
        isPaused: liveState.isPaused,
        lecturer: liveState.lecturer,
        title: liveState.title,
        startedAt: liveState.startedAt,
        updatedAt: liveState.updatedAt
      });
    }

    // If no LiveState exists, create a default one
    if (!liveState) {
      console.log("🔍 Live API: Creating default LiveState...");
      liveState = await LiveState.create({
        isLive: false,
        isPaused: false,
        mount: "/stream",
        title: undefined,
        lecturer: undefined,
        startedAt: null,
        pausedAt: null,
        updatedAt: new Date()
      });
      console.log("✅ Live API: Default LiveState created");
    }

    // Get stream URL from environment
    const streamUrl = process.env.STREAM_URL || "http://98.93.42.61:8000/stream";

    // Return public live state
    const response = {
      ok: true,
      isLive: liveState.isLive || false,
      isPaused: liveState.isPaused || false,
      title: liveState.title || null,
      lecturer: liveState.lecturer || null,
      startedAt: liveState.startedAt ? liveState.startedAt.toISOString() : null,
      pausedAt: liveState.pausedAt ? liveState.pausedAt.toISOString() : null,
      streamUrl,
    };
    
    console.log("✅ Live API: Returning response", response);
    
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
        isPaused: false,
        title: null,
        lecturer: null,
        startedAt: null,
        pausedAt: null,
        streamUrl: process.env.STREAM_URL || "http://98.93.42.61:8000/stream",
      }
    );
    
    fallbackResponse.headers.set('Cache-Control', 'no-cache, must-revalidate');
    return fallbackResponse;
  }
}
