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

    const { fileId, fileName, duration } = await request.json();
    if (!fileId || !fileName || !duration) {
      return NextResponse.json({ error: 'Missing required fields: fileId, fileName, duration' }, { status: 400 });
    }

    await connectDB();
    const liveState = await LiveState.findOne({ isLive: true });

    const audioFileInfo = {
      title: fileName,
      duration: Number(duration),
      startedAt: new Date().toISOString()
    };

    // Notify gateway — gateway calls /api/live/notify which pushes SSE to listeners.
    // We do NOT self-fetch /api/live/notify here because on Vercel serverless each
    // function runs in an isolated process — the SSE connections Set would be empty.
    // The gateway's notifyListeners() call is the reliable path on production.
    if (liveState) {
      try {
        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
        await fetch(`${gatewayUrl}/api/broadcast/audio/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: liveState._id.toString(),
            fileId, fileName,
            duration: Number(duration),
            timestamp: new Date()
          })
        });
      } catch { /* gateway not reachable in local dev — not critical */ }
    }

    return NextResponse.json({ success: true, message: 'Audio playback started', currentAudioFile: audioFileInfo });

  } catch (error) {
    console.error('Audio playback error:', error);
    return NextResponse.json({ error: 'Failed to start audio playback' }, { status: 500 });
  }
}
