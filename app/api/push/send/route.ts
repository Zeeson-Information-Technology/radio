import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { connectDB } from '@/lib/db';
import PushSubscription from '@/lib/models/PushSubscription';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:almanhajradio@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

/**
 * POST /api/push/send
 * Send a push notification to all subscribed listeners.
 * Called internally when a broadcast starts.
 * Protected by INTERNAL_API_KEY.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal key — same pattern as /api/live/notify
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`;
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, url } = await request.json();

    await connectDB();
    const subscriptions = await PushSubscription.find({}).lean();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No subscribers' });
    }

    const payload = JSON.stringify({
      title: title || 'Al-Manhaj Radio is Live',
      body: body || 'A new broadcast has just started. Tap to listen.',
      url: url || '/radio',
    });

    // Send to all subscribers, collect failures to clean up stale subscriptions
    const staleEndpoints: string[] = [];
    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        ).catch(err => {
          // 410 Gone = subscription expired/revoked by browser — remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          }
          throw err;
        })
      )
    );

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
      console.log(`🗑️ Removed ${staleEndpoints.length} stale push subscriptions`);
    }

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📲 Push notifications: ${sent} sent, ${failed} failed, ${staleEndpoints.length} stale removed`);

    return NextResponse.json({ success: true, sent, failed, total: subscriptions.length });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
