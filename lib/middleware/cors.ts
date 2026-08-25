import { NextRequest, NextResponse } from 'next/server';

/**
 * PRODUCTION-GRADE CORS CONFIGURATION
 * 
 * Implements restrictive CORS policy with:
 * - Explicit origin whitelist (no wildcards for sensitive endpoints)
 * - Credential support for authenticated requests
 * - Proper preflight handling
 * - Security headers
 * 
 * Reference: OWASP CORS Cheat Sheet
 */

/**
 * Allowed origins for CORS
 * Should be configured via environment variables
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS || '';
  const origins = envOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Always include localhost for development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080');
  }

  return origins;
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  
  // If no allowed origins configured, only allow localhost in dev
  if (allowedOrigins.length === 0) {
    return process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost');
  }

  return allowedOrigins.includes(origin);
}

/**
 * Public endpoints that allow '*' origin
 * Use sparingly - should only be for truly public data
 */
const PUBLIC_ENDPOINTS = [
  '/api/live', // Public broadcast status
];

/**
 * Check if endpoint allows public CORS
 */
function isPublicEndpoint(pathname: string): boolean {
  return PUBLIC_ENDPOINTS.some((endpoint) => pathname.startsWith(endpoint));
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  allowCredentials: boolean = false
): NextResponse {
  const origin = request.headers.get('origin');
  const pathname = new URL(request.url).pathname;

  // For public endpoints, allow all origins
  if (isPublicEndpoint(pathname)) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Accept-Encoding, Accept-Language'
    );
    return response;
  }

  // For authenticated endpoints, use whitelist
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    
    if (allowCredentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token, X-Requested-With'
    );

    // Cache preflight for 24 hours
    response.headers.set('Access-Control-Max-Age', '86400');
  } else {
    // Origin not allowed - don't set CORS headers
    response.headers.set('Access-Control-Allow-Origin', 'null');
  }

  return response;
}

/**
 * Handle CORS preflight OPTIONS request
 */
export function handleCorsPreFlight(request: NextRequest): NextResponse | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const origin = request.headers.get('origin');
  const pathname = new URL(request.url).pathname;
  const isPublic = isPublicEndpoint(pathname);

  // Check if origin is allowed (or public endpoint)
  if (!isPublic && origin && !isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(response, request, !isPublic);
}

/**
 * CORS middleware wrapper
 * Apply to all API routes
 */
export function withCorsProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  allowCredentials: boolean = false
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle CORS preflight
    const preFlightResponse = handleCorsPreFlight(request);
    if (preFlightResponse) {
      return preFlightResponse;
    }

    // Process request
    const response = await handler(request);

    // Apply CORS headers to response
    return applyCorsHeaders(response, request, allowCredentials);
  };
}

/**
 * List of allowed origins for reference
 */
export function describeCorsPolicy(): string {
  const allowedOrigins = getAllowedOrigins();
  const publicEndpoints = PUBLIC_ENDPOINTS.join(', ');

  return `
CORS Policy:
- Allowed Origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'none configured'}
- Public Endpoints (allow *): ${publicEndpoints}
- Environment: ${process.env.NODE_ENV}
- Credentials: ${'admin' in process.env ? 'required' : 'optional'}
  `.trim();
}
