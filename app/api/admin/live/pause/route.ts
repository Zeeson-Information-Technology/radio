import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import LiveState from "@/lib/models/LiveState";

/**
 * POST /api/admin/live/pause
 * Pause the current live broadcast temporarily
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
        { ok: false, error: "No active broadcast to pause" },
        { status: 400 }
      );
    }

    // Check if already paused
    if (liveState.isPaused) {
      return NextResponse.json(
        { ok: false, error: "Broadcast is already paused" },
        { status: 400 }
      );
    }

    // Pause the broadcast
    liveState.isPaused = true;
    liveState.pausedAt = new Date();
    await liveState.save();

    return NextResponse.json({
      ok: true,
      message: "Broadcast paused successfully",
      isPaused: true,
      pausedAt: liveState.pausedAt,
    });
  } catch (error) {
    console.error("Error pausing broadcast:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to pause broadcast" },
      { status: 500 }
    );
  }
}
