import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/server-auth';

/**
 * Toggle audio monitoring endpoint
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enabled } = await request.json();

    // Notify gateway to toggle monitoring
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
      const gatewayResponse = await fetch(`${gatewayUrl}/api/broadcast/monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: Boolean(enabled),
          timestamp: new Date()
        })
      });

      if (!gatewayResponse.ok) {
        console.error('Failed to notify gateway of monitor toggle');
        return NextResponse.json(
          { error: 'Failed to toggle monitoring' },
          { status: 500 }
        );
      }

      const result = await gatewayResponse.json();

      return NextResponse.json({
        success: true,
        message: `Audio monitoring ${enabled ? 'enabled' : 'disabled'}`,
        isMonitoring: Boolean(enabled)
      });

    } catch (gatewayError) {
      console.error('Gateway notification error:', gatewayError);
      return NextResponse.json(
        { error: 'Failed to communicate with gateway' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Monitor toggle error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle monitoring' },
      { status: 500 }
    );
  }
}