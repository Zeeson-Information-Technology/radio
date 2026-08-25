import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import LiveState from "@/lib/models/LiveState";
import { verifyAuthToken } from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/middleware/csrf";
import { broadcastStartSchema } from "@/lib/schemas";

/**
 * Start Live Stream API
 * POST /api/admin/live/start
 * 
 * Allows authenticated admins and presenters to start a live stream
 * Protected by: JWT authentication + CSRF token validation + Input validation
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

    // Find user to verify they exist and get their info
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

    // Parse and validate request body
    const body = await request.json();
    const validation = broadcastStartSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.issues.map((e) => ({
            field: e.path.join('.') || 'unknown',
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { title, lecturer } = validation.data;

    // Find or create LiveState document
    let liveState = await LiveState.findOne();
    
    if (!liveState) {
      liveState = new LiveState({
        isLive: false,
        mount: "/stream",
        title: "Offline",
        lecturer: "",
        startedAt: null,
      });
    }

    // Update LiveState to go live
    liveState.isLive = true;
    liveState.title = title;
    liveState.lecturer = lecturer;
    liveState.startedAt = new Date();
    liveState.mount = liveState.mount || "/stream";
    
    await liveState.save();

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
          type: 'broadcast_start',
          isLive: true,
          isMuted: false,
          title: liveState.title,
          lecturer: liveState.lecturer,
          startedAt: liveState.startedAt?.toISOString(),
          streamUrl: streamUrl,
          timestamp: new Date().toISOString()
        })
      });
      console.log('📡 Sent broadcast start notification to listeners with streamUrl:', streamUrl);
    } catch (notifyError) {
      console.error('Failed to send broadcast start notification:', notifyError);
    }

    return NextResponse.json({
      ok: true,
      isLive: true,
      message: "Live stream started successfully",
      liveState: {
        isLive: liveState.isLive,
        title: liveState.title,
        lecturer: liveState.lecturer,
        startedAt: liveState.startedAt?.toISOString(),
        mount: liveState.mount,
      },
    });
  } catch (error) {
    console.error("Start live stream error:", error);
    return NextResponse.json(
      { error: "An error occurred while starting the live stream" },
      { status: 500 }
    );
  }
}
