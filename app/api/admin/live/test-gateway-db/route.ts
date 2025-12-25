import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import LiveState from '@/lib/models/LiveState';

/**
 * GET /api/admin/live/test-gateway-db
 * Test if gateway database updates are working
 */
export async function GET() {
  try {
    await connectDB();
    
    // Get current live state
    const liveState = await LiveState.findOne();
    
    return NextResponse.json({
      ok: true,
      message: 'Database connection working',
      liveState: liveState ? {
        isLive: liveState.isLive,
        isMuted: liveState.isMuted,
        mutedAt: liveState.mutedAt,
        isMonitoring: liveState.isMonitoring,
        currentAudioFile: liveState.currentAudioFile,
        title: liveState.title,
        lecturer: liveState.lecturer,
        startedAt: liveState.startedAt,
        updatedAt: liveState.updatedAt,
        lastActivity: liveState.lastActivity
      } : null
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { error: 'Database connection failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/live/test-gateway-db
 * Manually set live state for testing
 */
export async function POST(request: Request) {
  try {
    const { isLive, title, lecturer } = await request.json();
    
    await connectDB();
    
    let liveState = await LiveState.findOne();
    
    if (!liveState) {
      liveState = new LiveState({
        isLive: isLive || false,
        isMuted: false,
        mutedAt: null,
        isMonitoring: false,
        currentAudioFile: null,
        mount: '/stream',
        title: title || 'Test Broadcast',
        lecturer: lecturer || 'Test Lecturer',
        startedAt: isLive ? new Date() : null,
        lastActivity: new Date(),
        updatedAt: new Date()
      });
      await liveState.save();
    } else {
      liveState.isLive = isLive || false;
      liveState.title = title || 'Test Broadcast';
      liveState.lecturer = lecturer || 'Test Lecturer';
      liveState.startedAt = isLive ? new Date() : null;
      liveState.lastActivity = new Date();
      liveState.updatedAt = new Date();
      await liveState.save();
    }
    
    return NextResponse.json({
      ok: true,
      message: 'Live state updated successfully',
      liveState: {
        isLive: liveState.isLive,
        isMuted: liveState.isMuted,
        mutedAt: liveState.mutedAt,
        isMonitoring: liveState.isMonitoring,
        currentAudioFile: liveState.currentAudioFile,
        title: liveState.title,
        lecturer: liveState.lecturer,
        startedAt: liveState.startedAt,
        lastActivity: liveState.lastActivity
      }
    });
  } catch (error) {
    console.error('Database update error:', error);
    return NextResponse.json(
      { error: 'Database update failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}