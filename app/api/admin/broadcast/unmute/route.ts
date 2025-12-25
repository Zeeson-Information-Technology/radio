import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/server-auth';
import { connectDB } from '@/lib/db';
import LiveState from '@/lib/models/LiveState';

/**
 * Unmute broadcast endpoint
 * Requirements: 2.5, 2.6
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

    // Update mute state (Requirements 2.6)
    liveState.isMuted = false;
    liveState.mutedAt = null;
    await liveState.save();

    // Notify gateway to unmute broadcast
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
      const gatewayResponse = await fetch(`${gatewayUrl}/api/broadcast/unmute`, {
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
        console.error('Failed to notify gateway of unmute operation');
      }
    } catch (gatewayError) {
      console.error('Gateway notification error:', gatewayError);
    }

    // Send real-time notification to listeners (Requirements 2.6)
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/live/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'broadcast_unmuted',
          timestamp: new Date(),
          sessionId: liveState._id.toString()
        })
      });
    } catch (notifyError) {
      console.error('Failed to send unmute notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Broadcast unmuted successfully',
      isMuted: false,
      mutedAt: null
    });

  } catch (error) {
    console.error('Unmute broadcast error:', error);
    return NextResponse.json(
      { error: 'Failed to unmute broadcast' },
      { status: 500 }
    );
  }
}