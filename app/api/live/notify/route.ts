import { NextRequest, NextResponse } from "next/server";
import { broadcastLiveUpdate } from "../events/route";

/**
 * Internal API to trigger live state notifications
 * POST /api/live/notify
 * 
 * Called by the gateway when broadcast state changes
 * Notifies all connected listeners via Server-Sent Events
 */

export async function POST(request: NextRequest) {
  try {
    // Verify this is called from our gateway (simple auth)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.JWT_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Broadcast the update to all connected listeners
    broadcastLiveUpdate({
      type: 'broadcast_update',
      isLive: data.isLive,
      isPaused: data.isPaused,
      title: data.title,
      lecturer: data.lecturer,
      startedAt: data.startedAt,
      streamUrl: process.env.STREAM_URL || "http://98.93.42.61:8000/stream",
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Update broadcasted to listeners',
      activeConnections: 0 // We'll update this if needed
    });
    
  } catch (error) {
    console.error('Error in live notify API:', error);
    return NextResponse.json(
      { error: 'Failed to notify listeners' },
      { status: 500 }
    );
  }
}