import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/server-auth';
import { connectDB } from '@/lib/db';
import LiveState from '@/lib/models/LiveState';

/**
 * Stop audio file playback during broadcast endpoint
 * Requirements: 3.6
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Find active broadcast session
    const liveState = await LiveState.findOne({ isLive: true });
    if (!liveState) {
      return NextResponse.json({ error: 'No active broadcast session' }, { status: 404 });
    }

    // Notify gateway to stop audio playback
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
      const gatewayResponse = await fetch(`${gatewayUrl}/api/broadcast/audio/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: liveState._id.toString(),
          timestamp: new Date()
        })
      });

      if (!gatewayResponse.ok) {
        console.error('Failed to notify gateway of audio stop');
        return NextResponse.json(
          { error: 'Failed to stop audio playback' },
          { status: 500 }
        );
      }
    } catch (gatewayError) {
      console.error('Gateway notification error:', gatewayError);
      return NextResponse.json(
        { error: 'Failed to communicate with gateway' },
        { status: 500 }
      );
    }

    // Send real-time notification to listeners
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/live/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
        },
        body: JSON.stringify({
          action: 'broadcast_event',
          type: 'audio_playback_stopped',
          timestamp: new Date().toISOString(),
          sessionId: liveState._id.toString()
        })
      });
    } catch (notifyError) {
      console.error('Failed to send audio stop notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Audio playback stopped successfully',
      currentAudioFile: null
    });

  } catch (error) {
    console.error('Audio stop error:', error);
    return NextResponse.json(
      { error: 'Failed to stop audio playback' },
      { status: 500 }
    );
  }
}