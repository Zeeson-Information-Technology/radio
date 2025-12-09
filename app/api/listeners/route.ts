import { NextResponse } from 'next/server';

/**
 * GET /api/listeners
 * Fetch current listener count from Icecast server
 */
export async function GET() {
  try {
    const streamUrl = process.env.STREAM_URL || '';
    
    // Check if stream is configured
    if (!streamUrl || streamUrl.includes('example.com')) {
      return NextResponse.json({
        ok: true,
        listeners: 0,
        configured: false,
        message: 'Stream not configured'
      });
    }

    // Try to fetch Icecast stats
    // Icecast provides stats at /status-json.xsl endpoint
    const statsUrl = streamUrl.replace(/\/[^\/]*$/, '/status-json.xsl');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(statsUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        // Parse Icecast JSON response
        // Structure: { icestats: { source: { listeners: number } } }
        const listeners = data?.icestats?.source?.listeners || 
                         data?.icestats?.source?.[0]?.listeners || 
                         0;

        return NextResponse.json({
          ok: true,
          listeners: listeners,
          configured: true,
          source: 'icecast',
          timestamp: new Date().toISOString()
        });
      }
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          ok: true,
          listeners: 0,
          configured: true,
          error: 'Timeout fetching stats',
          message: 'Could not reach Icecast stats endpoint'
        });
      }
      throw fetchError;
    }

    // If Icecast stats not available, return 0
    return NextResponse.json({
      ok: true,
      listeners: 0,
      configured: true,
      message: 'Stats endpoint not available'
    });

  } catch (error: any) {
    console.error('Error fetching listener count:', error);
    
    return NextResponse.json({
      ok: true,
      listeners: 0,
      error: error.message,
      message: 'Error fetching listener statistics'
    });
  }
}
