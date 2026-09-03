import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import mongoose from "mongoose";

/**
 * PUT /api/admin/presenters/[id]
 * Update a user's name, email, and/or role.
 *
 * Permission rules:
 *  - super_admin: can edit anyone, can change any role
 *  - admin: can edit presenters only, cannot elevate to admin/super_admin
 *  - presenter: cannot edit anyone
 *
 * Nobody can edit a super_admin except another super_admin.
 * Nobody can change their own role (prevents accidental self-demotion).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAuthToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    await connectDB();

    const currentAdmin = await AdminUser.findById(payload.userId);
    if (!currentAdmin) return NextResponse.json({ error: "Admin not found" }, { status: 401 });

    // Only super_admin and admin can edit users
    if (currentAdmin.role === "presenter") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const userToEdit = await AdminUser.findById(id);
    if (!userToEdit) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Admin cannot edit super_admin or other admins — only presenters
    if (currentAdmin.role === "admin" && userToEdit.role !== "presenter") {
      return NextResponse.json(
        { error: "Admins can only edit presenter accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, role } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Validate role if provided
    const validRoles = ["super_admin", "admin", "presenter"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Only super_admin can assign admin or super_admin roles
    if (role && role !== "presenter" && currentAdmin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can assign admin roles" },
        { status: 403 }
      );
    }

    // Nobody can change their own role (prevent accidental self-demotion)
    if (id === currentAdmin._id.toString() && role && role !== currentAdmin.role) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Check email uniqueness if email is changing
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== userToEdit.email) {
      const existing = await AdminUser.findOne({
        email: normalizedEmail,
        _id: { $ne: id }
      });
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
    }

    // Apply updates
    const updates: Record<string, string> = {
      name: name.trim(),
      email: normalizedEmail,
    };
    if (role) updates.role = role;

    const updated = await AdminUser.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, select: "name email role createdAt lastLoginAt" }
    );

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: {
        _id: updated!._id.toString(),
        name: updated!.name,
        email: updated!.email,
        role: updated!.role,
        createdAt: updated!.createdAt.toISOString(),
        lastLoginAt: updated!.lastLoginAt ? updated!.lastLoginAt.toISOString() : null,
      },
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
