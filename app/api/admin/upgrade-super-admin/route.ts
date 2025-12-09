import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";

/**
 * POST /api/admin/upgrade-super-admin
 * Upgrade current admin user to super_admin
 * Only works if you're already an admin
 */
export async function POST(request: NextRequest) {
  try {
    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user
    const user = await AdminUser.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Must be admin to upgrade
    if (user.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Only admins can be upgraded to super_admin" },
        { status: 403 }
      );
    }

    // Upgrade to super_admin
    user.role = "super_admin";
    await user.save();

    return NextResponse.json({
      ok: true,
      message: "Successfully upgraded to super_admin!",
      user: {
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to upgrade user" },
      { status: 500 }
    );
  }
}
