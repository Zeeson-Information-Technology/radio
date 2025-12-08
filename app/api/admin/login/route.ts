import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import { verifyPassword, signAuthToken } from "@/lib/auth";

/**
 * Admin login endpoint
 * POST /api/admin/login
 * 
 * Authenticates an admin user and sets an HTTP-only cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Invalid input format" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find admin user by email
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });

    // If user not found, return generic error (don't leak whether email exists)
    if (!admin) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, admin.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Update last login time
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate JWT token
    const token = signAuthToken({
      userId: admin._id.toString(),
      role: admin.role,
      email: admin.email,
    });

    // Create response
    const response = NextResponse.json({
      ok: true,
      message: "Login successful",
      user: {
        email: admin.email,
        role: admin.role,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
