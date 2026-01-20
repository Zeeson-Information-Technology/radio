import { NextRequest, NextResponse } from "next/server";
import { broadcastUpdate } from "../events/route";

/**
 * POST /api/live/notify
 * Endpoint for gateway to send broadcast events to SSE listeners
 */
export async function POST(request: NextRequest) {
  try {
    // Get headers first
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`;
    
    // Then parse body
    const body = await request.json();
    
    console.log('🔍 Notify API Debug:', {
      eventType: body.type,
      hasAuth: !!authHeader,
      authMatch: authHeader === expectedAuth
    });
    
    // Verify internal API key (basic security)
    if (authHeader !== expectedAuth) {
      console.warn('❌ Auth mismatch in notify endpoint');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract event dataSimple audio 
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
      case 'broadcast_start':
        sseEventData.isLive = eventData.isLive || true;
        sseEventData.isMuted = eventData.isMuted || false;
        sseEventData.title = eventData.title;
        sseEventData.lecturer = eventData.lecturer;
        sseEventData.startedAt = eventData.startedAt;
        sseEventData.streamUrl = eventData.streamUrl;
        break;

      case 'broadcast_stop':
        sseEventData.isLive = eventData.isLive || false;
        sseEventData.isMuted = eventData.isMuted || false;
        sseEventData.title = eventData.title || null;
        sseEventData.lecturer = eventData.lecturer || null;
        sseEventData.startedAt = eventData.startedAt || null;
        sseEventData.currentAudioFile = eventData.currentAudioFile || null;
        break;

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

      case 'audio_playback_paused':
        sseEventData.type = 'audio_playback_pause';
        sseEventData.isPaused = true;
        break;

      case 'audio_playback_resumed':
        sseEventData.type = 'audio_playback_resume';
        sseEventData.isPaused = false;
        break;

      case 'audio_playback_seeked':
        sseEventData.type = 'audio_playback_seek';
        sseEventData.currentTime = eventData.time || 0;
        break;

      case 'audio_playback_skipped':
        sseEventData.type = 'audio_playback_skip';
        sseEventData.skipSeconds = eventData.seconds || 0;
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