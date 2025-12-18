import { NextResponse } from "next/server";

/**
 * Stream Diagnostics API
 * GET /api/stream/diagnose
 * 
 * Comprehensive diagnostics for listener audio issues
 */
export async function GET() {
  try {
    const streamUrl = process.env.STREAM_URL || "http://98.93.42.61:8000/stream";
    const icecastBaseUrl = streamUrl.replace('/stream', '');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      streamUrl,
      tests: {} as any,
      analysis: undefined as any
    };

    // Test 1: Icecast Server Status
    try {
      const icecastResponse = await fetch(icecastBaseUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Al-Manhaj-Radio-Diagnostics/1.0' }
      });
      
      diagnostics.tests.icecastServer = {
        status: icecastResponse.status,
        available: icecastResponse.ok,
        headers: Object.fromEntries(icecastResponse.headers.entries())
      };
    } catch (error) {
      diagnostics.tests.icecastServer = {
        status: 'error',
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Stream Mount Point
    try {
      const streamResponse = await fetch(streamUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Al-Manhaj-Radio-Diagnostics/1.0' }
      });
      
      diagnostics.tests.streamMount = {
        status: streamResponse.status,
        available: streamResponse.ok,
        contentType: streamResponse.headers.get('content-type'),
        corsHeaders: {
          'access-control-allow-origin': streamResponse.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': streamResponse.headers.get('access-control-allow-methods'),
          'access-control-allow-headers': streamResponse.headers.get('access-control-allow-headers')
        },
        headers: Object.fromEntries(streamResponse.headers.entries())
      };
    } catch (error) {
      diagnostics.tests.streamMount = {
        status: 'error',
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Icecast Stats (if available)
    try {
      const statsUrl = `${icecastBaseUrl}/status-json.xsl`;
      const statsResponse = await fetch(statsUrl, {
        headers: { 'User-Agent': 'Al-Manhaj-Radio-Diagnostics/1.0' }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        diagnostics.tests.icecastStats = {
          available: true,
          data: statsData
        };
      } else {
        diagnostics.tests.icecastStats = {
          available: false,
          status: statsResponse.status
        };
      }
    } catch (error) {
      diagnostics.tests.icecastStats = {
        available: false,
        error: error instanceof Error ? error.message : 'Stats not available'
      };
    }

    // Test 4: Gateway Health
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_BROADCAST_GATEWAY_URL?.replace('ws://', 'http://').replace('wss://', 'https://') + '/health';
      const gatewayResponse = await fetch(gatewayUrl);
      
      if (gatewayResponse.ok) {
        const gatewayData = await gatewayResponse.json();
        diagnostics.tests.gateway = {
          available: true,
          data: gatewayData
        };
      } else {
        diagnostics.tests.gateway = {
          available: false,
          status: gatewayResponse.status
        };
      }
    } catch (error) {
      diagnostics.tests.gateway = {
        available: false,
        error: error instanceof Error ? error.message : 'Gateway not accessible'
      };
    }

    // Analysis and Recommendations
    const analysis = {
      overallStatus: 'unknown',
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // Analyze results
    if (!diagnostics.tests.icecastServer.available) {
      analysis.issues.push('Icecast server is not accessible');
      analysis.recommendations.push('Check if Icecast service is running on EC2');
    }

    if (!diagnostics.tests.streamMount.available) {
      analysis.issues.push('Stream mount point is not available');
      analysis.recommendations.push('Ensure FFmpeg is connected and streaming to Icecast');
    } else if (diagnostics.tests.streamMount.contentType !== 'audio/mpeg') {
      analysis.issues.push(`Unexpected content type: ${diagnostics.tests.streamMount.contentType}`);
      analysis.recommendations.push('Check FFmpeg MP3 encoding configuration');
    }

    if (!diagnostics.tests.streamMount.corsHeaders['access-control-allow-origin']) {
      analysis.issues.push('CORS headers missing - browsers may block the stream');
      analysis.recommendations.push('Configure CORS headers in Icecast or use Nginx proxy');
    }

    // Determine overall status
    if (diagnostics.tests.icecastServer.available && diagnostics.tests.streamMount.available) {
      analysis.overallStatus = 'healthy';
    } else if (diagnostics.tests.icecastServer.available) {
      analysis.overallStatus = 'partial';
    } else {
      analysis.overallStatus = 'unhealthy';
    }

    diagnostics.analysis = analysis;

    return NextResponse.json(diagnostics);
    
  } catch (error) {
    console.error("Stream diagnostics error:", error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Diagnostics failed',
      streamUrl: process.env.STREAM_URL || "http://98.93.42.61:8000/stream"
    }, { status: 500 });
  }
}