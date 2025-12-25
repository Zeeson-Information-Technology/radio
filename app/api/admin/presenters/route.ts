import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, hashPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import mongoose from "mongoose";

/**
 * GET /api/admin/presenters
 * Get list of presenters for audio sharing
 * Requirements: 7.2
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectDB();
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    // Get all users (including current user for complete user management)
    // Sort by role priority (super_admin first, then admin, then presenter) and then by name
    const presenters = await AdminUser.find({
      role: { $in: ['presenter', 'admin', 'super_admin'] }
    })
    .select('name email role createdAt lastLoginAt')
    .lean();

    // Sort users with super_admin first, then admin, then presenter, and by name within each role
    const sortedPresenters = presenters.sort((a, b) => {
      // Define role priority (lower number = higher priority)
      const rolePriority = {
        'super_admin': 1,
        'admin': 2,
        'presenter': 3
      };

      const aPriority = rolePriority[a.role as keyof typeof rolePriority] || 4;
      const bPriority = rolePriority[b.role as keyof typeof rolePriority] || 4;

      // First sort by role priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Then sort by name within the same role
      return a.name.localeCompare(b.name);
    });

    const formattedPresenters = sortedPresenters.map(presenter => ({
      _id: presenter._id.toString(),
      name: presenter.name,
      email: presenter.email,
      role: presenter.role,
      createdAt: presenter.createdAt.toISOString(),
      lastLoginAt: presenter.lastLoginAt ? presenter.lastLoginAt.toISOString() : null
    }));

    return NextResponse.json({
      success: true,
      presenters: formattedPresenters,
      count: formattedPresenters.length
    });

  } catch (error) {
    console.error("Error fetching presenters:", error);
    return NextResponse.json(
      { error: "Failed to fetch presenters" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/presenters
 * Create a new presenter/admin user
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectDB();
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    // Only super_admin and admin can create users
    if (admin.role !== "super_admin" && admin.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { name, email, role } = await request.json();

    // Validate input
    if (!name?.trim() || !email?.trim() || !role) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    }

    // Validate role
    if (!["presenter", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Only super_admin can create admin users
    if (role === "admin" && admin.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can create admin users" }, { status: 403 });
    }

    // Check if email already exists
    const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const passwordHash = await hashPassword(tempPassword);

    // Create new user
    const newUser = await AdminUser.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      mustChangePassword: true,
      createdBy: admin._id
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      tempPassword,
      user: {
        _id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/presenters
 * Delete a user (super admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectDB();
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    // Only super_admin can delete users
    if (admin.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can delete users" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === admin._id.toString()) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Find the user to delete
    const userToDelete = await AdminUser.findById(userId);
    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete the user
    await AdminUser.findByIdAndDelete(userId);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}