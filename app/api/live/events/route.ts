import { NextRequest } from "next/server";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/middleware/rateLimit";

// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

/**
 * GET /api/live/events
 * Server-Sent Events endpoint for real-time broadcast updates
 * Rate limited: 60 requests per minute per IP to prevent connection spam
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting to connection attempts
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.PUBLIC.limit, RATE_LIMITS.PUBLIC.windowMs);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
        },
      }
    );
  }

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
      'X-RateLimit-Limit': RATE_LIMITS.PUBLIC.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetAt / 1000).toString(),
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