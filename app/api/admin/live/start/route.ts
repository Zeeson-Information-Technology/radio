import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import LiveState from "@/lib/models/LiveState";
import { verifyAuthToken } from "@/lib/auth";

/**
 * Start Live Stream API
 * POST /api/admin/live/start
 * 
 * Allows authenticated admins and presenters to start a live stream
 */
export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json();
    const { title, lecturer } = body;

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
    liveState.title = title || "Live Session";
    liveState.lecturer = lecturer || user.email;
    liveState.startedAt = new Date();
    liveState.mount = liveState.mount || "/stream";
    
    await liveState.save();

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
