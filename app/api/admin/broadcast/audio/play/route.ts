import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/server-auth';
import { connectDB } from '@/lib/db';
import LiveState from '@/lib/models/LiveState';

/**
 * Play audio file during broadcast endpoint
 * Requirements: 3.1, 3.2, 3.7
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, fileName, duration } = await request.json();

    if (!fileId || !fileName || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId, fileName, duration' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find active broadcast session
    const liveState = await LiveState.findOne({ isLive: true });
    if (!liveState) {
      return NextResponse.json({ error: 'No active broadcast session' }, { status: 404 });
    }

    // Update current audio file state (in memory tracking - Requirements 6.3)
    const audioFileInfo = {
      title: fileName,
      duration: Number(duration),
      startedAt: new Date().toISOString()
    };

    // Notify gateway to start audio playback
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
      const gatewayResponse = await fetch(`${gatewayUrl}/api/broadcast/audio/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: liveState._id.toString(),
          fileId,
          fileName,
          duration: Number(duration),
          timestamp: new Date()
        })
      });

      if (!gatewayResponse.ok) {
        console.error('Failed to notify gateway of audio playback');
        return NextResponse.json(
          { error: 'Failed to start audio playback' },
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

    // Send real-time notification to listeners (Requirements 5.3)
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
          type: 'audio_playback_started',
          audioFile: audioFileInfo,
          timestamp: new Date().toISOString(),
          sessionId: liveState._id.toString()
        })
      });
    } catch (notifyError) {
      console.error('Failed to send audio playback notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Audio playback started successfully',
      currentAudioFile: audioFileInfo
    });

  } catch (error) {
    console.error('Audio playback error:', error);
    return NextResponse.json(
      { error: 'Failed to start audio playback' },
      { status: 500 }
    );
  }
}