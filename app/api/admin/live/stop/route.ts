import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import LiveState from "@/lib/models/LiveState";
import { verifyAuthToken } from "@/lib/auth";

/**
 * Stop Live Stream API
 * POST /api/admin/live/stop
 * 
 * Allows authenticated admins and presenters to stop a live stream
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
      liveState = await LiveState.create({
        isLive: false,
        mount: "/stream",
        title: "Offline",
        lecturer: "",
        startedAt: null,
      });
    } else {
      // Update LiveState to go offline
      liveState.isLive = false;
      liveState.title = liveState.title || "Offline";
      liveState.startedAt = null;
      
      await liveState.save();
    }

    return NextResponse.json({
      ok: true,
      isLive: false,
      message: "Live stream stopped successfully",
      liveState: {
        isLive: liveState.isLive,
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
