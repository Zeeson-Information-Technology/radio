import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import Schedule from "@/lib/models/Schedule";

/**
 * POST /api/admin/migrate-timezones
 * Add timezone field to schedules that don't have it
 * Admin only
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

    // Find user and verify admin role
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Only super admin can run migrations
    if (admin.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Find schedules without timezone
    const schedulesWithoutTimezone = await Schedule.find({
      $or: [
        { timezone: { $exists: false } },
        { timezone: null },
        { timezone: "" }
      ]
    });

    if (schedulesWithoutTimezone.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "All schedules already have timezone field",
        updated: 0,
      });
    }

    // Update each schedule
    let updated = 0;
    for (const schedule of schedulesWithoutTimezone) {
      schedule.timezone = "Africa/Lagos";
      await schedule.save();
      updated++;
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully added timezone to ${updated} schedule(s)`,
      updated,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to migrate schedules" },
      { status: 500 }
    );
  }
}
