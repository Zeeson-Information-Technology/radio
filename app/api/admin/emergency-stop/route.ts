import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";

/**
 * Super Admin Emergency Stop API
 * POST /api/admin/emergency-stop
 * 
 * Allows super admins to immediately terminate any ongoing broadcast
 * This is for emergency situations, content moderation, or technical issues
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

    // Only super admins can use emergency stop
    if (admin.role !== "super_admin") {
      return NextResponse.json(
        { 
          success: false, 
          message: "Emergency stop is restricted to super administrators only" 
        },
        { status: 403 }
      );
    }

    console.log(`🚨 Emergency stop initiated by super admin: ${admin.email}`);

    // Connect to database
    await connectDB();

    // Get current live state
    const liveState = await LiveState.findOne();
    
    if (!liveState || !liveState.isLive) {
      return NextResponse.json({
        success: false,
        message: "No active broadcast to stop"
      });
    }

    const originalLecturer = liveState.lecturer;
    const originalTitle = liveState.title;

    // Force stop the broadcast - set everything to offline
    await LiveState.findOneAndUpdate(
      {},
      {
        isLive: false,
        isPaused: false,
        title: null,
        lecturer: null,
        startedAt: null,
        pausedAt: null,
        updatedAt: new Date()
      },
      { upsert: true }
    );

    // Notify the gateway server to stop streaming
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://98.93.42.61:8080';
      const response = await fetch(`${gatewayUrl}/api/emergency-stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        },
        body: JSON.stringify({
          adminId: admin._id,
          adminEmail: admin.email,
          reason: 'Super admin emergency stop'
        })
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to notify gateway server of emergency stop');
      }
    } catch (gatewayError) {
      console.warn('⚠️ Could not reach gateway server for emergency stop:', gatewayError);
      // Continue anyway - database state is updated
    }

    // Log the emergency stop action
    console.log(`🛑 Emergency stop completed by ${admin.email}`);
    console.log(`📊 Stopped broadcast: "${originalTitle}" by ${originalLecturer}`);

    // Notify listeners via SSE (if the endpoint exists)
    try {
      const appUrl = process.env.NEXTJS_URL || 'http://localhost:3000';
      await fetch(`${appUrl}/api/live/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        },
        body: JSON.stringify({
          isLive: false,
          isPaused: false,
          title: null,
          lecturer: null,
          startedAt: null,
          emergencyStop: true,
          stoppedBy: admin.email
        })
      });
    } catch (notifyError) {
      console.warn('⚠️ Could not notify listeners of emergency stop:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast terminated successfully by super admin`,
      stoppedBroadcast: {
        title: originalTitle,
        lecturer: originalLecturer
      }
    });

  } catch (error) {
    console.error("❌ Emergency stop API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error during emergency stop" 
      },
      { status: 500 }
    );
  }
}