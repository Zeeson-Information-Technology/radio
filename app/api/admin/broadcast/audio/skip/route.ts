import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

/**
 * POST /api/admin/broadcast/audio/skip
 * Skip forward or backward in currently playing audio
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
    const { seconds } = body;

    if (typeof seconds !== 'number') {
      return NextResponse.json({ 
        error: "Invalid seconds parameter" 
      }, { status: 400 });
    }

    // Send skip command to gateway
    const gatewayResponse = await fetch(`${process.env.GATEWAY_URL}/api/broadcast/audio/skip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GATEWAY_API_KEY}`
      },
      body: JSON.stringify({
        userId: payload.userId,
        action: 'skip',
        seconds: seconds
      })
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error('Gateway skip error:', errorText);
      return NextResponse.json({ 
        error: "Failed to skip audio" 
      }, { status: 500 });
    }

    const result = await gatewayResponse.json();
    
    const direction = seconds > 0 ? 'forward' : 'backward';
    const absSeconds = Math.abs(seconds);
    
    return NextResponse.json({
      success: true,
      message: `Skipped ${direction} ${absSeconds}s`,
      seconds: seconds,
      ...result
    });

  } catch (error) {
    console.error("Error skipping audio:", error);
    return NextResponse.json(
      { error: "Failed to skip audio" },
      { status: 500 }
    );
  }
}