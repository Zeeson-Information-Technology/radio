import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";
import { checkRateLimit, applyRateLimitHeaders, RATE_LIMITS, getClientIp } from "@/lib/middleware/rateLimit";
import { applyCorsHeaders, handleCorsPreFlight } from "@/lib/middleware/cors";

/**
 * Public Live State API
 * GET /api/live
 * 
 * Returns current live stream status and metadata
 * No authentication required - public endpoint
 * Rate limited: 60 requests per minute per IP
 * CORS: Allow all origins (public data)
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.PUBLIC.limit, RATE_LIMITS.PUBLIC.windowMs);

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        { status: 429 }
      );
      response.headers.set('Retry-After', rateLimitResult.retryAfter?.toString() || '60');
      return applyCorsHeaders(response, request);
    }

    // Reduced logging for performance
    await connectDB();
    let liveState = await LiveState.findOne().lean();

    // If no LiveState exists, create a default one
    if (!liveState) {
      liveState = new LiveState({
        isLive: false,
        isMuted: false,
        mutedAt: null,
        mount: "/stream",
        title: undefined,
        lecturer: undefined,
        startedAt: null,
        isMonitoring: false,
        currentAudioFile: null,
        lastActivity: new Date(),
        updatedAt: new Date()
      });
      await liveState.save();
    }

    // Get stream URL from environment
    const streamUrl = process.env.STREAM_URL || (process.env.NODE_ENV === 'production' ? 'http://178.128.46.95:8000/stream' : 'http://localhost:8080/test-stream');

    // Return public live state with enhanced broadcast control information
    const response = {
      ok: true,
      isLive: liveState.isLive || false,
      isMuted: liveState.isMuted || false,
      mutedAt: liveState.mutedAt ? liveState.mutedAt.toISOString() : null,
      title: liveState.title || null,
      lecturer: liveState.lecturer || null,
      startedAt: liveState.startedAt ? liveState.startedAt.toISOString() : null,
      streamUrl,
      // Enhanced broadcast control fields (for listeners)
      currentAudioFile: liveState.currentAudioFile ? {
        title: liveState.currentAudioFile.title,
        duration: liveState.currentAudioFile.duration,
        startedAt: liveState.currentAudioFile.startedAt.toISOString()
      } : null,
    };
    
    // Create response with cache headers for faster subsequent requests
    const jsonResponse = NextResponse.json(response);
    jsonResponse.headers.set('Cache-Control', 'no-cache, must-revalidate');
    
    // Apply rate limit headers and CORS headers
    applyRateLimitHeaders(jsonResponse, rateLimitResult, RATE_LIMITS.PUBLIC.limit);
    return applyCorsHeaders(jsonResponse, request);
  } catch (error) {
    console.error("Live state API error:", error);
    console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
    
    // Return fallback state on error
    const fallbackResponse = NextResponse.json(
      {
        ok: true, // Changed to true so UI doesn't break
        isLive: false,
        isMuted: false,
        mutedAt: null,
        title: null,
        lecturer: null,
        startedAt: null,
        streamUrl: process.env.STREAM_URL || (process.env.NODE_ENV === 'production' ? 'http://178.128.46.95:8000/stream' : 'http://localhost:8080/test-stream'),
        currentAudioFile: null,
      }
    );
    
    fallbackResponse.headers.set('Cache-Control', 'no-cache, must-revalidate');
    return applyCorsHeaders(fallbackResponse, request);
  }
}

/**
 * Handle CORS preflight OPTIONS requests
 */
export async function OPTIONS(request: NextRequest) {
  const preFlightResponse = handleCorsPreFlight(request);
  if (preFlightResponse) {
    return preFlightResponse;
  }
  return new NextResponse(null, { status: 204 });
}
