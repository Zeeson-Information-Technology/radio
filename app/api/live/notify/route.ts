import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";
import { broadcastUpdate } from "../events/route";

/**
 * POST /api/live/notify
 * Notify listeners of broadcast state changes
 * Called by admin when starting/stopping broadcasts
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { action, title, lecturer } = await request.json();

    // Validate action
    if (!['start', 'stop', 'mute', 'unmute'].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get current live state
    let liveState = await LiveState.findOne();
    
    if (!liveState) {
      liveState = new LiveState({
        isLive: false,
        isMuted: false,
        mount: '/stream',
        title: undefined,
        lecturer: undefined,
        startedAt: null,
        updatedAt: new Date()
      });
      await liveState.save();
    }

    // Update state based on action
    switch (action) {
      case 'start':
        liveState.isLive = true;
        liveState.isMuted = false;
        liveState.title = title || 'Live Lecture';
        liveState.lecturer = lecturer || admin.name || admin.email;
        liveState.startedAt = new Date();
        break;
        
      case 'stop':
        liveState.isLive = false;
        liveState.isMuted = false;
        liveState.title = undefined;
        liveState.lecturer = undefined;
        liveState.startedAt = null;
        break;
        
      case 'mute':
        if (liveState.isLive) {
          liveState.isMuted = true;
        }
        break;
        
      case 'unmute':
        if (liveState.isLive) {
          liveState.isMuted = false;
        }
        break;
    }

    liveState.updatedAt = new Date();
    await liveState.save();

    console.log(`📢 Broadcast notification: ${action} by ${admin.email}`);

    // Broadcast real-time update to all listeners
    const updateData = {
      type: `broadcast_${action}`,
      action,
      isLive: liveState.isLive,
      isMuted: liveState.isMuted,
      title: liveState.title || null,
      lecturer: liveState.lecturer || null,
      startedAt: liveState.startedAt?.toISOString() || null,
      timestamp: new Date().toISOString(),
      streamUrl: process.env.STREAM_URL || "http://98.93.42.61:8000/stream"
    };
    
    broadcastUpdate(updateData);

    return NextResponse.json({
      success: true,
      message: `Listeners will see the ${action} immediately`,
      action,
      state: {
        isLive: liveState.isLive,
        isMuted: liveState.isMuted,
        title: liveState.title || null,
        lecturer: liveState.lecturer || null,
        startedAt: liveState.startedAt?.toISOString() || null
      }
    });

  } catch (error) {
    console.error("❌ Notification API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to send notification" 
      },
      { status: 500 }
    );
  }
}