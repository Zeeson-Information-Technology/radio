import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import PushSubscription from '@/lib/models/PushSubscription';

/**
 * POST /api/push/unsubscribe
 * Remove a push subscription when listener turns off notifications.
 */
export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    await connectDB();
    await PushSubscription.deleteOne({ endpoint });

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
