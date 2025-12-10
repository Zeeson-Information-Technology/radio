import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import AdminUser from '@/lib/models/AdminUser';
import { verifyAuthToken } from '@/lib/auth';

/**
 * POST /api/admin/live/broadcast-token
 * Generate a JWT token for browser broadcasting
 */
export async function POST() {
  try {
    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify admin token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Connect to database and get user
    await connectDB();
    const user = await AdminUser.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has broadcast permissions
    if (!['super_admin', 'admin', 'presenter'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to broadcast' },
        { status: 403 }
      );
    }

    // Generate broadcast token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const broadcastToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        type: 'broadcast',
        iat: Math.floor(Date.now() / 1000),
      },
      jwtSecret,
      {
        expiresIn: '1h', // Token valid for 1 hour
        issuer: 'almanhaj-radio',
        audience: 'broadcast-gateway'
      }
    );

    console.log(`✅ Generated broadcast token for ${user.email} (${user.role})`);

    return NextResponse.json({
      ok: true,
      token: broadcastToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      },
      expiresIn: 3600 // 1 hour in seconds
    });

  } catch (error) {
    console.error('Broadcast token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate broadcast token' },
      { status: 500 }
    );
  }
}