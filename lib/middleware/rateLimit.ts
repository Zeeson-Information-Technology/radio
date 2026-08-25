import { NextRequest, NextResponse } from 'next/server';

/**
 * PRODUCTION-GRADE RATE LIMITING MIDDLEWARE
 * 
 * Implements sliding window rate limiting to prevent abuse
 * Uses in-memory store for development (not suitable for production)
 * 
 * For production with multiple instances, integrate with:
 * - Upstash Redis (recommended for serverless)
 * - AWS ElastiCache
 * - Self-hosted Redis
 */

interface RateLimitStore {
  requests: { timestamp: number; tokens: number }[];
  lastReset: number;
}

// In-memory store (development only)
// In production, replace with Redis
const inMemoryStore = new Map<string, RateLimitStore>();

/**
 * Clean up old entries to prevent memory leak
 */
function cleanup() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [key, store] of inMemoryStore.entries()) {
    if (now - store.lastReset > maxAge) {
      inMemoryStore.delete(key);
    }
  }
}

/**
 * Get or create rate limit store for a key
 */
function getStore(key: string): RateLimitStore {
  if (!inMemoryStore.has(key)) {
    inMemoryStore.set(key, {
      requests: [],
      lastReset: Date.now(),
    });
  }
  return inMemoryStore.get(key)!;
}

/**
 * Check if request is within rate limit
 * Returns: { allowed: boolean, remaining: number, resetAt: number }
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Core rate limiting logic using sliding window algorithm
 * @param key - Unique identifier (IP, user ID, etc.)
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const store = getStore(key);
  const now = Date.now();
  const windowStart = now - windowMs;

  // Remove old requests outside the window
  store.requests = store.requests.filter((req) => req.timestamp > windowStart);

  // Check if limit exceeded
  if (store.requests.length >= limit) {
    const oldestRequest = store.requests[0];
    const resetAt = oldestRequest.timestamp + windowMs;
    const retryAfter = Math.ceil((resetAt - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }

  // Add current request
  store.requests.push({
    timestamp: now,
    tokens: 1,
  });

  // Calculate when this window resets
  const resetAt = Math.max(...store.requests.map((r) => r.timestamp)) + windowMs;

  return {
    allowed: true,
    remaining: limit - store.requests.length,
    resetAt,
  };
}

/**
 * Middleware factory for rate limiting
 */
export interface RateLimitConfig {
  limit: number; // Max requests
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (request: NextRequest) => string; // Custom key function
  onLimitExceeded?: (result: RateLimitResult) => NextResponse; // Custom response
}

const DEFAULT_KEY_GENERATOR = (request: NextRequest): string => {
  // Use IP address as key
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  ).split(',')[0];
};

/**
 * Create a rate limit middleware for an API route
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const { limit, windowMs, keyGenerator = DEFAULT_KEY_GENERATOR } = config;

  return async (request: NextRequest) => {
    // Run cleanup periodically
    if (Math.random() < 0.01) {
      cleanup();
    }

    const key = keyGenerator(request);
    const result = checkRateLimit(key, limit, windowMs);

    // Set rate limit headers
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
    };

    if (!result.allowed) {
      headers['Retry-After'] = result.retryAfter?.toString() || '60';

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers,
        }
      );
    }

    // Request allowed - store headers for response middleware
    // (This is a limitation of Next.js middleware - we can't modify response)
    return null; // Continue to handler
  };
}

/**
 * Apply rate limit headers to response
 * Use in API routes after checking rate limit
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  limit: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

  if (!result.allowed && result.retryAfter) {
    response.headers.set('Retry-After', result.retryAfter.toString());
  }

  return response;
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Public endpoints: 60 requests per minute per IP
  PUBLIC: {
    limit: 60,
    windowMs: 60 * 1000,
  },

  // Authenticated endpoints: 300 requests per minute per user
  AUTH: {
    limit: 300,
    windowMs: 60 * 1000,
  },

  // Broadcasting: 10 connection attempts per hour
  BROADCAST: {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  },

  // Login: 5 attempts per 15 minutes
  LOGIN: {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  },

  // File upload: 20 uploads per hour
  UPLOAD: {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  },

  // API calls: 100 per minute
  API: {
    limit: 100,
    windowMs: 60 * 1000,
  },
};

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Get user ID from token for authenticated rate limiting
 */
export function getUserIdFromToken(
  request: NextRequest
): string | null {
  try {
    // Try to get from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7).split('.')[1]; // JWT payload (not secure, just for grouping)
    }

    // Try to get from cookie
    const token = request.cookies.get('admin_token')?.value;
    if (token) {
      return token.split('.')[1]; // JWT payload
    }

    return null;
  } catch {
    return null;
  }
}
