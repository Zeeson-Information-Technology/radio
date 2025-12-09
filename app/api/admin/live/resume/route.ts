import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import LiveState from "@/lib/models/LiveState";

/**
 * POST /api/admin/live/resume
 * Resume a paused live broadcast
 */
export async function POST(request: NextRequest) {
  try {
    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get current live state
    let liveState = await LiveState.findOne();
    
    if (!liveState) {
      return NextResponse.json(
        { ok: false, error: "Live state not found" },
        { status: 404 }
      );
    }

    // Check if currently live
    if (!liveState.isLive) {
      return NextResponse.json(
        { ok: false, error: "No active broadcast to resume" },
        { status: 400 }
      );
    }

    // Check if actually paused
    if (!liveState.isPaused) {
      return NextResponse.json(
        { ok: false, error: "Broadcast is not paused" },
        { status: 400 }
      );
    }

    // Resume the broadcast
    liveState.isPaused = false;
    liveState.pausedAt = null;
    await liveState.save();

    return NextResponse.json({
      ok: true,
      message: "Broadcast resumed successfully",
      isPaused: false,
    });
  } catch (error) {
    console.error("Error resuming broadcast:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to resume broadcast" },
      { status: 500 }
    );
  }
}
