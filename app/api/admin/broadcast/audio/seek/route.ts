import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

/**
 * POST /api/admin/broadcast/audio/seek
 * Seek to specific time in currently playing audio
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

    const body = await request.json();
    const { time } = body;

    if (typeof time !== 'number' || time < 0) {
      return NextResponse.json({ 
        error: "Invalid time parameter" 
      }, { status: 400 });
    }

    // Send seek command to gateway
    const gatewayResponse = await fetch(`${process.env.GATEWAY_URL}/api/broadcast/audio/seek`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GATEWAY_API_KEY}`
      },
      body: JSON.stringify({
        userId: payload.userId,
        action: 'seek',
        time: time
      })
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error('Gateway seek error:', errorText);
      return NextResponse.json({ 
        error: "Failed to seek audio" 
      }, { status: 500 });
    }

    const result = await gatewayResponse.json();
    
    return NextResponse.json({
      success: true,
      message: `Audio seeked to ${Math.floor(time)}s`,
      time: time,
      ...result
    });

  } catch (error) {
    console.error("Error seeking audio:", error);
    return NextResponse.json(
      { error: "Failed to seek audio" },
      { status: 500 }
    );
  }
}