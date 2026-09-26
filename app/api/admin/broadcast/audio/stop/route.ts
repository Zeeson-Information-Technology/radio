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

    // Use request host for self-fetch — works in both dev and production
    const host = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    try {
      await fetch(`${host}/api/live/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
        },
        body: JSON.stringify({
          action: 'broadcast_event',
          type: 'audio_playback_stopped',
          timestamp: new Date().toISOString(),
          sessionId: liveState?._id?.toString() || 'local'
        })
      });
    } catch (notifyError) {
      console.error('Failed to notify listeners:', notifyError);
    }

    // Notify gateway (best-effort)
    if (liveState) {
      try {
        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
        await fetch(`${gatewayUrl}/api/broadcast/audio/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: liveState._id.toString(), timestamp: new Date() })
        });
      } catch { /* not critical */ }
    }

    return NextResponse.json({ success: true, message: 'Audio playback stopped', currentAudioFile: null });

  } catch (error) {
    console.error('Audio stop error:', error);
    return NextResponse.json({ error: 'Failed to stop audio playback' }, { status: 500 });
  }
}
