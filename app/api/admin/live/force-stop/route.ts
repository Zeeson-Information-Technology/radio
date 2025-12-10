import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import LiveState from '@/lib/models/LiveState';
import { verifyAuthToken } from '@/lib/auth';

/**
 * POST /api/admin/live/force-stop
 * Force stop any active broadcast (for session recovery)
 */
export async function POST() {
  try {
    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify admin token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Force stop any active broadcast
    let liveState = await LiveState.findOne();
    
    if (!liveState) {
      liveState = await LiveState.create({
        isLive: false,
        isPaused: false,
        mount: '/stream',
        title: undefined,
        lecturer: undefined,
        startedAt: null,
        pausedAt: null,
        updatedAt: new Date()
      });
    } else {
      liveState.isLive = false;
      liveState.isPaused = false;
      liveState.title = undefined;
      liveState.lecturer = undefined;
      liveState.startedAt = null;
      liveState.pausedAt = null;
      liveState.updatedAt = new Date();
      await liveState.save();
    }

    console.log(`🛑 Force stopped broadcast by ${payload.userId}`);

    return NextResponse.json({
      ok: true,
      message: 'Broadcast forcefully stopped'
    });

  } catch (error) {
    console.error('Force stop error:', error);
    return NextResponse.json(
      { error: 'Failed to force stop broadcast' },
      { status: 500 }
    );
  }
}