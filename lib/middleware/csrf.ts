import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * PRODUCTION-GRADE CSRF PROTECTION
 * 
 * Implements Double-Submit Cookie pattern with:
 * - Cryptographically secure token generation
 * - SameSite cookie enforcement
 * - Token validation on state-changing requests
 * - Protection against CSRF attacks
 * 
 * Reference: OWASP CSRF Prevention Cheat Sheet
 */

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_COOKIE_MAXAGE = 24 * 60 * 60; // 24 hours

/**
 * Generate a cryptographically secure CSRF token
 * @returns 32-byte hex string token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a CSRF token cookie to send to client
 */
export function createCsrfTokenCookie(token: string, response: NextResponse): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript for forms
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // Prevent cookie sending to other origins
    path: '/',
    maxAge: CSRF_COOKIE_MAXAGE,
  });
}

/**
 * Verify CSRF token from request headers against cookie
 * 
 * Returns:
 * - true if token is valid
 * - false if token is missing or doesn't match
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  // Get token from request header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    console.warn('CSRF validation failed: No token in headers');
    return false;
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    console.warn('CSRF validation failed: No token in cookie');
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const headerBuffer = Buffer.from(headerToken);
  const cookieBuffer = Buffer.from(cookieToken);

  if (headerBuffer.length !== cookieBuffer.length) {
    console.warn('CSRF validation failed: Token length mismatch');
    return false;
  }

  const isValid = crypto.timingSafeEqual(headerBuffer, cookieBuffer);

  if (!isValid) {
    console.warn('CSRF validation failed: Tokens do not match');
  }

  return isValid;
}

/**
 * Middleware factory for CSRF protection
 * 
 * Only protects state-changing methods (POST, PUT, DELETE, PATCH)
 * GET and HEAD requests are exempt (should be idempotent)
 */
export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Get request method
    const method = request.method.toUpperCase();

    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return handler(request);
    }

    // Verify CSRF token for state-changing methods
    if (!verifyCsrfToken(request)) {
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'Cross-site request forgery validation failed',
        },
        { status: 403 }
      );
    }

    // Token is valid, continue to handler
    return handler(request);
  };
}

/**
 * Get CSRF token from request (for reading current token)
 */
export function getCsrfToken(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Initialize CSRF token for client
 * Call this on GET requests to provide token to forms
 */
export function initializeCsrfToken(response: NextResponse): NextResponse {
  // Check if token already exists
  if (!response.cookies.has(CSRF_COOKIE_NAME)) {
    const token = generateCsrfToken();
    createCsrfTokenCookie(token, response);
  }
  return response;
}

/**
 * CSRF protected endpoints should include this in response headers
 * Client-side code can read this to know token is present
 */
export const CSRF_PROTECTION_HEADERS = {
  'X-CSRF-Protection': 'enabled',
};

/**
 * Exempted endpoints that don't need CSRF protection
 * (These should be uncommon - most POST/PUT/DELETE need protection)
 */
export const CSRF_EXEMPT_ENDPOINTS = [
  // Add endpoints that are exempt from CSRF (e.g., webhook handlers)
  '/api/webhooks/',
];

/**
 * Check if endpoint is exempt from CSRF protection
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_ENDPOINTS.some((exempt) => pathname.startsWith(exempt));
}
