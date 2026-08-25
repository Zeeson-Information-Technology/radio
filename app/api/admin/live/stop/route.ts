import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import LiveState from "@/lib/models/LiveState";
import { verifyAuthToken } from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/middleware/csrf";

/**
 * Stop Live Stream API
 * POST /api/admin/live/stop
 * 
 * Allows authenticated admins and presenters to stop a live stream
 * Protected by: JWT authentication + CSRF token validation
 */
export async function POST(request: NextRequest) {
  try {
    // Verify CSRF token (prevent cross-site request forgery)
    if (!verifyCsrfToken(request)) {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 }
      );
    }

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user to verify they exist
    const user = await AdminUser.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify user is admin or presenter
    if (user.role !== "admin" && user.role !== "presenter") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Find the LiveState document
    let liveState = await LiveState.findOne();
    
    if (!liveState) {
      // Create a default offline state if none exists
      liveState = new LiveState({
        isLive: false,
        isMuted: false,
        mutedAt: null,
        mount: "/stream",
        title: "Offline",
        lecturer: undefined,
        startedAt: null,
        isMonitoring: false,
        currentAudioFile: null,
        lastActivity: new Date(),
      });
      await liveState.save();
    } else {
      // Update LiveState to go offline - reset all broadcast control state
      liveState.isLive = false;
      liveState.isMuted = false;
      liveState.mutedAt = null;
      liveState.isMonitoring = false;
      liveState.currentAudioFile = null;
      liveState.title = liveState.title || "Offline";
      liveState.startedAt = null;
      liveState.lastActivity = new Date();
      
      await liveState.save();
    }

    // Send real-time notification to listeners
    try {
      // Ensure we have a valid stream URL before sending to listeners
      const streamUrl = process.env.STREAM_URL || 'http://localhost:8000/stream';
      
      // Log warning if STREAM_URL env var is not configured
      if (!process.env.STREAM_URL) {
        console.warn('⚠️ STREAM_URL not configured in environment, using fallback:', streamUrl);
      }
      
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/live/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
        },
        body: JSON.stringify({
          action: 'broadcast_event',
          type: 'broadcast_stop',
          isLive: false,
          isMuted: false,
          title: null,
          lecturer: null,
          startedAt: null,
          currentAudioFile: null,
          streamUrl: streamUrl,
          timestamp: new Date().toISOString()
        })
      });
      console.log('📡 Sent broadcast stop notification to listeners with streamUrl:', streamUrl);
    } catch (notifyError) {
      console.error('Failed to send broadcast stop notification:', notifyError);
    }

    return NextResponse.json({
      ok: true,
      isLive: false,
      message: "Live stream stopped successfully",
      liveState: {
        isLive: liveState.isLive,
        isMuted: liveState.isMuted,
        mutedAt: liveState.mutedAt,
        isMonitoring: liveState.isMonitoring,
        currentAudioFile: liveState.currentAudioFile,
        title: liveState.title,
        lecturer: liveState.lecturer,
        startedAt: null,
        mount: liveState.mount,
      },
    });
  } catch (error) {
    console.error("Stop live stream error:", error);
    return NextResponse.json(
      { error: "An error occurred while stopping the live stream" },
      { status: 500 }
    );
  }
}
