import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

/**
 * POST /api/admin/broadcast/audio/resume
 * Resume paused audio during live broadcast
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

    // Send resume command to gateway
    const gatewayResponse = await fetch(`${process.env.GATEWAY_URL}/api/broadcast/audio/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GATEWAY_API_KEY}`
      },
      body: JSON.stringify({
        userId: payload.userId,
        action: 'resume'
      })
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error('Gateway resume error:', errorText);
      return NextResponse.json({ 
        error: "Failed to resume audio" 
      }, { status: 500 });
    }

    const result = await gatewayResponse.json();
    
    return NextResponse.json({
      success: true,
      message: "Audio resumed successfully",
      ...result
    });

  } catch (error) {
    console.error("Error resuming audio:", error);
    return NextResponse.json(
      { error: "Failed to resume audio" },
      { status: 500 }
    );
  }
}