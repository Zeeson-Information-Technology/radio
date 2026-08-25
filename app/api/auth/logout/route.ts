import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AdminUser from '@/lib/models/AdminUser';
import { verifyAccessToken } from '@/lib/auth';

/**
 * Logout endpoint with token revocation
 * POST /api/auth/logout
 * 
 * Implements stateful token revocation by incrementing user's tokenVersion
 * This invalidates all existing refresh tokens issued before this logout
 * Aligns with OAuth 2.0 token revocation specifications
 * 
 * Flow:
 * 1. Verify access token to identify user
 * 2. Increment user's tokenVersion in database
 * 3. Clear auth cookies
 * 4. All previously issued refresh tokens become invalid
 */
export async function POST(request: NextRequest) {
  try {
    // Get access token from cookie
    const accessToken = request.cookies.get('admin_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify access token
    const decoded = verifyAccessToken(accessToken);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Fetch user and increment tokenVersion to revoke all refresh tokens
    const user = await AdminUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Increment tokenVersion - this invalidates all existing refresh tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Create response
    const response = NextResponse.json({
      ok: true,
      message: 'Logged out successfully',
    });

    // Clear all auth cookies
    response.cookies.delete('admin_token');
    response.cookies.delete('admin_refresh_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}
