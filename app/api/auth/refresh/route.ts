import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AdminUser from '@/lib/models/AdminUser';
import { verifyRefreshToken, issueTokens } from '@/lib/auth';

/**
 * Refresh access token endpoint
 * POST /api/auth/refresh
 * 
 * Takes a refresh token from HTTP-only cookie and issues a new access token
 * This implements the OAuth 2.0 refresh token grant pattern
 * 
 * Request: Refresh token sent via httpOnly cookie (automatic)
 * Response: New access token (in response body or memory)
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from httpOnly cookie
    const refreshToken = request.cookies.get('admin_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Verify refresh token is valid and not expired
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      // Token is invalid or expired - clear cookies and force re-login
      const response = NextResponse.json(
        { error: 'Refresh token expired or invalid' },
        { status: 401 }
      );
      response.cookies.delete('admin_token');
      response.cookies.delete('admin_refresh_token');
      return response;
    }

    // Connect to database
    await connectDB();

    // Fetch user to check current tokenVersion (for revocation support)
    const user = await AdminUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if refresh token version matches current user version
    // If versions don't match, token has been revoked via logout
    if (decoded.tokenVersion !== user.tokenVersion) {
      const response = NextResponse.json(
        { error: 'Refresh token has been revoked' },
        { status: 401 }
      );
      response.cookies.delete('admin_token');
      response.cookies.delete('admin_refresh_token');
      return response;
    }

    // Issue new tokens
    const { accessToken, refreshToken: newRefreshToken } = issueTokens(
      {
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
      },
      user.tokenVersion
    );

    // Create response with new access token in body
    const response = NextResponse.json({
      ok: true,
      message: 'Access token refreshed',
      accessToken,
    });

    // Set new access token in cookie (short-lived)
    response.cookies.set('admin_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    // Set new refresh token in cookie (long-lived)
    response.cookies.set('admin_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'An error occurred while refreshing token' },
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
