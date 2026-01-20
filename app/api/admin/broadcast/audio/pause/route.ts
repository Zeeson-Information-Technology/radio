import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

/**
 * POST /api/admin/broadcast/audio/pause
 * Pause currently playing audio during live broadcast
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Send pause command to gateway
    const gatewayResponse = await fetch(`${process.env.GATEWAY_URL}/api/broadcast/audio/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GATEWAY_API_KEY}`
      },
      body: JSON.stringify({
        userId: payload.userId,
        action: 'pause'
      })
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error('Gateway pause error:', errorText);
      return NextResponse.json({ 
        error: "Failed to pause audio" 
      }, { status: 500 });
    }

    const result = await gatewayResponse.json();
    
    return NextResponse.json({
      success: true,
      message: "Audio paused successfully",
      ...result
    });

  } catch (error) {
    console.error("Error pausing audio:", error);
    return NextResponse.json(
      { error: "Failed to pause audio" },
      { status: 500 }
    );
  }
}