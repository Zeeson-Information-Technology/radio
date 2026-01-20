import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import LiveState from '@/lib/models/LiveState';

export async function POST(request: NextRequest) {
  try {
    console.log('🛑 Force stop broadcast requested');

    // Connect to database
    await connectDB();

    // Force reset the live state
    await LiveState.findOneAndUpdate(
      {},
      {
        isLive: false,
        isMuted: false,
        title: null,
        lecturer: null,
        startedAt: null,
        currentAudioFile: null,  // Clear any existing audio file state
        updatedAt: new Date()
      },
      { upsert: true }
    );

    console.log('✅ Live state force reset to offline');

    return NextResponse.json({
      success: true,
      message: 'Broadcast session force stopped',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Force stop error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to force stop broadcast',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}