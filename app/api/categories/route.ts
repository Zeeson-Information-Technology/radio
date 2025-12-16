import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category from "@/lib/models/Category";

/**
 * GET /api/categories
 * Fetch all visible categories for dropdowns and selection
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get all visible categories sorted by display order
    const categories = await Category.find({ isVisible: true })
      .select('name arabicName description icon color displayOrder recordingCount')
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      categories: categories.map(cat => ({
        id: cat._id.toString(),
        name: cat.name,
        arabicName: cat.arabicName,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        displayOrder: cat.displayOrder,
        recordingCount: cat.recordingCount
      }))
    });

  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch categories",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create default categories (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Create default categories
    await Category.createDefaults();

    return NextResponse.json({
      success: true,
      message: "Default categories created successfully"
    });

  } catch (error) {
    console.error("Create categories error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create categories",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}