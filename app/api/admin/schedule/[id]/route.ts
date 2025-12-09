import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import Schedule from "@/lib/models/Schedule";
import { verifyAuthToken } from "@/lib/auth";

/**
 * GET /api/admin/schedule/[id]
 * Get a single schedule entry by ID (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user and verify admin role
    const user = await AdminUser.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Find schedule by ID
    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: schedule,
    });
  } catch (error) {
    console.error("Get schedule error:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching schedule" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/schedule/[id]
 * Update a schedule entry (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user and verify admin role
    const user = await AdminUser.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { dayOfWeek, startTime, timezone, durationMinutes, lecturer, topic, active } = body;

    // Find and update schedule
    const schedule = await Schedule.findByIdAndUpdate(
      id,
      {
        dayOfWeek,
        startTime,
        timezone: timezone || "Africa/Lagos", // Default to Nigeria if not provided
        durationMinutes,
        lecturer,
        topic,
        active,
      },
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: schedule,
    });
  } catch (error) {
    console.error("Update schedule error:", error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        { error: "Validation error: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while updating schedule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/schedule/[id]
 * Delete a schedule entry (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user and verify admin role
    const user = await AdminUser.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Delete schedule
    const schedule = await Schedule.findByIdAndDelete(id);

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Delete schedule error:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting schedule" },
      { status: 500 }
    );
  }
}
