import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server-auth";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";
import jwt from "jsonwebtoken";

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
        isMuted: false,
        title: undefined,
        lecturer: undefined,
        startedAt: null,
        updatedAt: new Date()
      },
      { upsert: true }
    );

    // Notify the gateway server to stop streaming
    try {
      // Generate proper JWT token for gateway authentication
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const gatewayToken = jwt.sign(
        {
          userId: admin._id.toString(),
          email: admin.email,
          role: admin.role,
          type: 'emergency-stop',
          iat: Math.floor(Date.now() / 1000),
        },
        jwtSecret,
        {
          expiresIn: '1h',
          issuer: 'almanhaj-radio',
          audience: 'broadcast-gateway'
        }
      );

      const gatewayUrl = process.env.GATEWAY_URL || 'http://98.93.42.61:8080';
      const response = await fetch(`${gatewayUrl}/api/emergency-stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gatewayToken}`
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

    // Note: Listeners will see the change when they manually refresh the page
    // This saves significant API costs compared to real-time notifications

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