import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import Schedule from "@/lib/models/Schedule";
import { verifyAuthToken } from "@/lib/auth";

/**
 * GET /api/admin/schedule
 * List schedule entries (all authenticated users)
 * Query params:
 *   - filter: "mine" | "all" (default: "all")
 */
export async function GET(request: NextRequest) {
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

    // Find user - all authenticated users can view schedules
    const user = await AdminUser.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    // Fetch ALL schedules first
    const allSchedules = await Schedule.find({})
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    // Update any schedules without createdBy
    const updatePromises = allSchedules
      .filter((s: any) => !s.createdBy)
      .map((s: any) => 
        Schedule.findByIdAndUpdate(s._id, {
          $set: {
            createdBy: user._id,
            recurringType: s.recurringType || "weekly",
            startDate: s.startDate || new Date(),
          }
        })
      );

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // Now filter based on user preference
    let schedules = allSchedules;
    if (filter === "mine") {
      // Filter to show only schedules created by current user
      schedules = allSchedules.filter((s: any) => {
        // After update, unowned schedules now belong to current user
        return !s.createdBy || s.createdBy.toString() === user._id.toString();
      });
    }

    // Get all unique creator IDs
    const creatorIds = [...new Set(
      schedules
        .map((s: any) => s.createdBy)
        .filter(Boolean)
        .map((id: any) => id.toString())
    )];

    // Fetch all creators at once
    const creators = await AdminUser.find({ _id: { $in: creatorIds } })
      .select("name email role")
      .lean();

    // Create a map for quick lookup
    const creatorMap = new Map(
      creators.map((c: any) => [c._id.toString(), c])
    );

    // Build final schedule list with creator info
    const schedulesWithCreator = schedules.map((schedule: any) => {
      let creatorInfo = { 
        _id: user._id.toString(), 
        name: user.name || "Unknown", 
        email: user.email, 
        role: user.role 
      };

      if (schedule.createdBy) {
        const creator = creatorMap.get(schedule.createdBy.toString());
        if (creator) {
          creatorInfo = {
            _id: creator._id.toString(),
            name: creator.name || "Unknown",
            email: creator.email,
            role: creator.role,
          };
        }
      }

      return {
        ...schedule,
        _id: schedule._id.toString(),
        createdBy: creatorInfo,
        recurringType: schedule.recurringType || "weekly",
        startDate: schedule.startDate || new Date().toISOString(),
        endDate: schedule.endDate || null,
      };
    });

    return NextResponse.json({
      ok: true,
      items: schedulesWithCreator,
      currentUserId: user._id.toString(),
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

    // Find user - all authenticated users can create schedules
    const user = await AdminUser.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      dayOfWeek, 
      startTime, 
      timezone, 
      durationMinutes, 
      lecturer, 
      topic, 
      active,
      recurringType,
      startDate,
      endDate
    } = body;

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
      createdBy: user._id,
      recurringType: recurringType || "weekly",
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
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
