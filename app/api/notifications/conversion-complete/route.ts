import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key for security
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.INTERNAL_API_KEY;
    
    if (!expectedKey || !authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, recordId, title, timestamp } = body;

    console.log(`📬 Received conversion notification: ${title} (${recordId})`);

    // For now, just log the notification
    // User specifically requested no polling, so we'll rely on manual refresh
    // This endpoint exists so the gateway doesn't get 404 errors
    
    return NextResponse.json({
      success: true,
      message: 'Conversion notification received',
      notification: {
        type,
        recordId,
        title,
        timestamp
      }
    });

  } catch (error) {
    console.error('❌ Error processing conversion notification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}