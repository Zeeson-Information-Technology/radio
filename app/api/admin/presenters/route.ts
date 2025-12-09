import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import { hashPassword, verifyAuthToken } from "@/lib/auth";
import crypto from "crypto";

/**
 * Presenters management endpoint
 * GET /api/admin/presenters - List all presenters (admin only)
 * POST /api/admin/presenters - Create new presenter (admin only)
 */

// Helper to check if user is admin or super_admin
async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  await connectDB();
  const admin = await AdminUser.findById(payload.userId);
  
  // Must be super_admin or admin role
  if (!admin || (admin.role !== "super_admin" && admin.role !== "admin")) {
    return null;
  }

  return admin;
}

/**
 * GET - List all presenters
 */
export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    await connectDB();

    // Fetch all users (both admins and presenters, excluding the current admin if desired)
    const presenters = await AdminUser.find({})
      .select("-passwordHash") // Don't send password hash
      .sort({ createdAt: -1 });

    return NextResponse.json({
      ok: true,
      presenters,
    });
  } catch (error) {
    console.error("Get presenters error:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching presenters" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new presenter
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, role = "presenter" } = body;

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== "admin" && role !== "presenter") {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'presenter'" },
        { status: 400 }
      );
    }

    // Role hierarchy: Only super_admin can create admins
    // Regular admins can only create presenters
    if (role === "admin" && admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admin can create admin users" },
        { status: 403 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Generate temporary password (8 random characters)
    const tempPassword = crypto.randomBytes(4).toString("hex");

    // Hash the temporary password
    const passwordHash = await hashPassword(tempPassword);

    // Create user with specified role
    const newUser = await AdminUser.create({
      email: email.toLowerCase(),
      passwordHash,
      role: role,
      mustChangePassword: false,
      createdBy: admin._id,
    });

    return NextResponse.json({
      ok: true,
      message: `${role === "admin" ? "Admin" : "Presenter"} created successfully`,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
      tempPassword, // Return temp password so admin can share it
    });
  } catch (error) {
    console.error("Create presenter error:", error);
    
    // Handle MongoDB duplicate key error
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "An error occurred while creating presenter" },
      { status: 500 }
    );
  }
}
