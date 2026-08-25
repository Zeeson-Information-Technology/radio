import { NextResponse } from 'next/server';

/**
 * Gateway Configuration API
 * GET /api/gateway-config
 * 
 * Returns the WebSocket gateway URL for browser clients
 * This endpoint is server-side only, so the URL isn't exposed in client bundles
 */
export async function GET() {
  try {
    // Get gateway URL from environment
    // In production (Vercel), BROADCAST_GATEWAY_URL is set without NEXT_PUBLIC_ prefix
    // In development, it can fall back to localhost
    const gatewayUrl = process.env.BROADCAST_GATEWAY_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'ws://178.128.46.95:8080'
        : 'ws://localhost:8080');
    
    const streamUrl = process.env.STREAM_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'http://178.128.46.95:8000/stream'
        : 'http://localhost:8080/test-stream');
    
    return NextResponse.json({
      gatewayUrl,
      streamUrl,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error retrieving gateway config:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve gateway configuration' },
      { status: 500 }
    );
  }
}
