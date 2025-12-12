import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import LiveState from "@/lib/models/LiveState";

/**
 * Server-Sent Events endpoint for live broadcast updates
 * GET /api/live/events
 * 
 * Streams real-time updates to listeners when broadcast state changes
 * Much more cost-effective than polling!
 */

// Store active connections to broadcast updates
const connections = new Set<ReadableStreamDefaultController>();

// Broadcast update to all connected listeners
export function broadcastLiveUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Remove dead connections
      connections.delete(controller);
    }
  });
  
  console.log(`📡 Broadcasted update to ${connections.size} listeners:`, data);
}

export async function GET(request: NextRequest) {
  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to our set
      connections.add(controller);
      
      // Send initial state immediately
      connectDB().then(async () => {
        try {
          const liveState = await LiveState.findOne().lean();
          const initialData = {
            type: 'initial',
            isLive: liveState?.isLive || false,
            isPaused: liveState?.isPaused || false,
            title: liveState?.title || null,
            lecturer: liveState?.lecturer || null,
            startedAt: liveState?.startedAt?.toISOString() || null,
            streamUrl: process.env.STREAM_URL || "http://98.93.42.61:8000/stream"
          };
          
          const message = `data: ${JSON.stringify(initialData)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
          console.error('Error sending initial SSE data:', error);
        }
      });
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`data: {"type":"heartbeat"}\n\n`));
        } catch (error) {
          clearInterval(heartbeat);
          connections.delete(controller);
        }
      }, 30000);
      
      // Cleanup when connection closes
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        connections.delete(controller);
        console.log(`📡 SSE connection closed. Active connections: ${connections.size}`);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}