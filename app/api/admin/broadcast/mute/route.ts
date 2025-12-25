import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/server-auth';
import { connectDB } from '@/lib/db';
import LiveState from '@/lib/models/LiveState';

/**
 * Mute broadcast endpoint
 * Requirements: 2.1, 2.2, 2.3, 2.4
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

    // Update mute state (Requirements 2.2, 2.3)
    liveState.isMuted = true;
    liveState.mutedAt = new Date();
    await liveState.save();

    // Notify gateway to mute broadcast
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
      const gatewayResponse = await fetch(`${gatewayUrl}/api/broadcast/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: liveState._id.toString(),
          timestamp: liveState.mutedAt
        })
      });

      if (!gatewayResponse.ok) {
        console.error('Failed to notify gateway of mute operation');
      }
    } catch (gatewayError) {
      console.error('Gateway notification error:', gatewayError);
    }

    // Send real-time notification to listeners (Requirements 2.4)
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/live/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'broadcast_muted',
          timestamp: liveState.mutedAt,
          sessionId: liveState._id.toString()
        })
      });
    } catch (notifyError) {
      console.error('Failed to send mute notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Broadcast muted successfully',
      isMuted: true,
      mutedAt: liveState.mutedAt
    });

  } catch (error) {
    console.error('Mute broadcast error:', error);
    return NextResponse.json(
      { error: 'Failed to mute broadcast' },
      { status: 500 }
    );
  }
}