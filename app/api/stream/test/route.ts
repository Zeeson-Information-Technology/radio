import { NextResponse } from "next/server";

/**
 * Stream Test API
 * GET /api/stream/test
 * 
 * Tests if the Icecast stream is currently available
 */
export async function GET() {
  try {
    const streamUrl = process.env.STREAM_URL || "http://98.93.42.61:8000/stream";
    
    // Test if the stream is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(streamUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Al-Manhaj-Radio-Test/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      return NextResponse.json({
        available: response.ok,
        status: response.status,
        statusText: response.statusText,
        streamUrl,
        timestamp: new Date().toISOString()
      });
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      return NextResponse.json({
        available: false,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        streamUrl,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error("Stream test error:", error);
    
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : 'Test failed',
      streamUrl: process.env.STREAM_URL || "http://98.93.42.61:8000/stream",
      timestamp: new Date().toISOString()
    });
  }
}