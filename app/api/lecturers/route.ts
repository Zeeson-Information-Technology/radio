import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lecturer from "@/lib/models/Lecturer";
import { getCurrentAdmin } from "@/lib/server-auth";

/**
 * GET /api/lecturers
 * Returns list of lecturers sorted by recording count (most used first)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const lecturers = await Lecturer.find(
      { isActive: true },
      { name: 1, arabicName: 1, recordingCount: 1, isVerified: 1, _id: 1 }
    )
    .sort({ recordingCount: -1, name: 1 })
    .limit(100)
    .lean();

    return NextResponse.json({
      success: true,
      lecturers: lecturers.map(l => ({
        _id: l._id.toString(),
        name: l.name,
        arabicName: l.arabicName || null,
        recordingCount: l.recordingCount || 0,
        isVerified: l.isVerified || false
      }))
    });

  } catch (error) {
    console.error("Error fetching lecturers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch lecturers", lecturers: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lecturers
 * Create a new lecturer (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!["super_admin", "admin"].includes(admin.role)) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, arabicName } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await Lecturer.findOne({ name: name.trim() });
    if (existing) {
      // If previously deactivated, reactivate instead of duplicating
      if (!existing.isActive) {
        existing.isActive = true;
        if (arabicName) existing.arabicName = arabicName.trim();
        await existing.save();
        return NextResponse.json({ success: true, lecturer: { _id: existing._id.toString(), name: existing.name, arabicName: existing.arabicName || null, recordingCount: existing.recordingCount, isVerified: existing.isVerified } });
      }
      return NextResponse.json({ success: false, message: `Lecturer "${name.trim()}" already exists` }, { status: 409 });
    }

    const lecturer = new Lecturer({
      name: name.trim(),
      arabicName: arabicName?.trim() || undefined,
      createdBy: admin._id,
      isActive: true,
      isVerified: false
    });

    await lecturer.save();

    return NextResponse.json({
      success: true,
      lecturer: {
        _id: lecturer._id.toString(),
        name: lecturer.name,
        arabicName: lecturer.arabicName || null,
        recordingCount: 0,
        isVerified: false
      }
    });

  } catch (error) {
    console.error("Error creating lecturer:", error);
    return NextResponse.json({ success: false, message: "Failed to create lecturer" }, { status: 500 });
  }
}

/**
 * DELETE /api/lecturers?id=...
 * Soft-delete a lecturer (admin only) — sets isActive=false
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!["super_admin", "admin"].includes(admin.role)) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
    }

    await connectDB();

    const lecturer = await Lecturer.findById(id);
    if (!lecturer) {
      return NextResponse.json({ success: false, message: "Lecturer not found" }, { status: 404 });
    }

    // Soft delete — keeps recording references intact
    lecturer.isActive = false;
    await lecturer.save();

    return NextResponse.json({ success: true, message: `${lecturer.name} removed` });

  } catch (error) {
    console.error("Error deleting lecturer:", error);
    return NextResponse.json({ success: false, message: "Failed to delete lecturer" }, { status: 500 });
  }
}