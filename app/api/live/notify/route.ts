import { NextRequest, NextResponse } from "next/server";
import { broadcastUpdate } from "../events/route";

/**
 * POST /api/live/notify
 * Endpoint for gateway to send broadcast events to SSE listeners
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify internal API key (basic security)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`;
    
    console.log('🔍 Notify API Debug:', {
      receivedAuth: authHeader?.substring(0, 20) + '...',
      expectedAuth: expectedAuth.substring(0, 20) + '...',
      match: authHeader === expectedAuth,
      eventType: body.type
    });
    
    if (authHeader !== expectedAuth) {
      console.warn('❌ Auth mismatch:', { received: authHeader, expected: expectedAuth });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract event data
    const { action, type, message, ...eventData } = body;
    
    if (action !== 'broadcast_event' || !type) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
    }

    // Map gateway event types to SSE event types
    const sseEventData = {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...eventData
    };

    // Handle specific event types
    switch (type) {
      case 'broadcast_muted':
        sseEventData.isMuted = true;
        sseEventData.mutedAt = eventData.mutedAt || new Date().toISOString();
        break;
        
      case 'broadcast_unmuted':
        sseEventData.isMuted = false;
        sseEventData.mutedAt = null;
        break;
        
      case 'audio_playback_started':
        // Map to the format expected by RadioPlayer
        sseEventData.type = 'audio_playback_start';
        sseEventData.currentAudioFile = {
          title: eventData.audioFile?.title || 'Unknown Audio',
          duration: eventData.audioFile?.duration || 0,
          startedAt: new Date().toISOString()
        };
        break;
        
      case 'audio_playback_stopped':
        // Map to the format expected by RadioPlayer
        sseEventData.type = 'audio_playback_stop';
        sseEventData.currentAudioFile = null;
        break;
    }

    // Broadcast to all SSE listeners
    broadcastUpdate(sseEventData);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Event broadcasted to listeners' 
    });
    
  } catch (error) {
    console.error('❌ Error in notify endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}