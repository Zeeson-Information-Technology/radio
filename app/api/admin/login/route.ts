import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import { verifyPassword, issueTokens } from "@/lib/auth";
import { checkRateLimit, applyRateLimitHeaders, RATE_LIMITS, getClientIp } from "@/lib/middleware/rateLimit";
import { loginSchema } from "@/lib/schemas";
import { applyCorsHeaders, handleCorsPreFlight } from "@/lib/middleware/cors";

/**
 * Admin login endpoint
 * POST /api/admin/login
 * 
 * Authenticates an admin user and issues:
 * - Short-lived access token (15 minutes) for API requests
 * - Long-lived refresh token (7 days) for token renewal
 * 
 * Both tokens are set as httpOnly cookies for security
 * Access token can also be read from response body for local storage if needed
 * 
 * Rate limited: 5 login attempts per 15 minutes per IP to prevent brute force
 * Input validated with Zod schemas
 * CORS: Whitelist configured origins for credentials support
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent brute force attacks
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.windowMs);

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too many login attempts',
          message: `Too many failed login attempts. Try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        { status: 429 }
      );
      response.headers.set('Retry-After', rateLimitResult.retryAfter?.toString() || '900');
      return applyCorsHeaders(response, request, true); // Allow credentials
    }

    // Parse request body
    const body = await request.json();

    // Validate input with Zod schema
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const response = NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.issues.map((e) => ({
            field: e.path.join('.') || 'unknown',
            message: e.message,
          })),
        },
        { status: 400 }
      );
      return applyCorsHeaders(response, request, true);
    }

    const { email, password } = validation.data;

    // Connect to database
    await connectDB();

    // Find admin user by email
    const admin = await AdminUser.findOne({ email });

    // If user not found, return generic error (don't leak whether email exists)
    if (!admin) {
      const response = NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
      return applyCorsHeaders(response, request, true);
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, admin.passwordHash);

    if (!isPasswordValid) {
      const response = NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
      return applyCorsHeaders(response, request, true);
    }

    // Update last login time
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate both access and refresh tokens
    const { accessToken, refreshToken } = issueTokens(
      {
        userId: admin._id.toString(),
        role: admin.role,
        email: admin.email,
      },
      admin.tokenVersion
    );

    // Create response
    const response = NextResponse.json({
      ok: true,
      message: "Login successful",
      user: {
        email: admin.email,
        role: admin.role,
      },
      // Also return access token in body for flexibility
      // (though httpOnly cookie is more secure)
      accessToken,
    });

    // Set access token cookie (short-lived: 15 minutes)
    response.cookies.set("admin_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    // Set refresh token cookie (long-lived: 7 days)
    response.cookies.set("admin_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return applyCorsHeaders(response, request, true);
  } catch (error) {
    console.error("Login error:", error);
    const response = NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
    return applyCorsHeaders(response, request, true);
  }
}

/**
 * Handle CORS preflight OPTIONS requests
 */
export async function OPTIONS(request: NextRequest) {
  const preFlightResponse = handleCorsPreFlight(request);
  if (preFlightResponse) {
    return preFlightResponse;
  }
  return new NextResponse(null, { status: 204 });
}
