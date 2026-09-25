import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import PushSubscription from '@/lib/models/PushSubscription';

/**
 * POST /api/push/subscribe
 * Save a push subscription from a listener's browser.
 * Called when the listener grants notification permission.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    await connectDB();

    // Upsert — update if endpoint already exists, insert if new
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys, userAgent: userAgent || '' },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
