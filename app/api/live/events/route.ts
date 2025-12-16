import { NextRequest } from "next/server";

// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

/**
 * GET /api/live/events
 * Server-Sent Events endpoint for real-time broadcast updates
 */
export async function GET(request: NextRequest) {
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to active connections
      connections.add(controller);
      
      // Send initial connection message
      const data = `data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to live updates',
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(data));
      
      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          
          controller.enqueue(new TextEncoder().encode(heartbeatData));
        } catch (error) {
          // Connection closed, clean up
          clearInterval(heartbeat);
          connections.delete(controller);
        }
      }, 30000); // Heartbeat every 30 seconds
      
      // Clean up when connection closes
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        connections.delete(controller);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

/**
 * Broadcast update to all connected listeners
 */
export function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encodedMessage = new TextEncoder().encode(message);
  
  // Send to all active connections
  for (const controller of connections) {
    try {
      controller.enqueue(encodedMessage);
    } catch (error) {
      // Connection closed, remove it
      connections.delete(controller);
    }
  }
  
  console.log(`📡 Broadcasted update to ${connections.size} listeners:`, data.type);
}