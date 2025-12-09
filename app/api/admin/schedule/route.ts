import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import Schedule from "@/lib/models/Schedule";
import { verifyAuthToken } from "@/lib/auth";

/**
 * GET /api/admin/schedule
 * List all schedule entries (admin only)
 */
export async function GET() {
  try {
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

    // Fetch all schedules, sorted by day and time
    const schedules = await Schedule.find()
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    return NextResponse.json({
      ok: true,
      items: schedules,
    });
  } catch (error) {
    console.error("Get schedules error:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching schedules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/schedule
 * Create a new schedule entry (admin only)
 */
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (
      dayOfWeek === undefined ||
      !startTime ||
      !timezone ||
      !durationMinutes ||
      !lecturer ||
      !topic
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new schedule entry
    const schedule = await Schedule.create({
      dayOfWeek,
      startTime,
      timezone,
      durationMinutes,
      lecturer,
      topic,
      mount: "/stream",
      active: active !== undefined ? active : true,
    });

    return NextResponse.json({
      ok: true,
      item: schedule,
    });
  } catch (error) {
    console.error("Create schedule error:", error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        { error: "Validation error: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while creating schedule" },
      { status: 500 }
    );
  }
}
