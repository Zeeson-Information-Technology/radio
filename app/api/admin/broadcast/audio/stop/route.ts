import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/server-auth';
import { connectDB } from '@/lib/db';
import LiveState from '@/lib/models/LiveState';

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const liveState = await LiveState.findOne({ isLive: true });

    // Notify gateway — gateway calls /api/live/notify which pushes SSE to listeners.
    if (liveState) {
      try {
        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
        await fetch(`${gatewayUrl}/api/broadcast/audio/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: liveState._id.toString(), timestamp: new Date() })
        });
      } catch { /* gateway not reachable in local dev — not critical */ }
    }

    return NextResponse.json({ success: true, message: 'Audio playback stopped', currentAudioFile: null });

  } catch (error) {
    console.error('Audio stop error:', error);
    return NextResponse.json({ error: 'Failed to stop audio playback' }, { status: 500 });
  }
}
