import { NextResponse } from "next/server";

/**
 * Admin logout endpoint
 * POST /api/admin/logout
 * 
 * Clears the admin authentication cookie
 */
export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({
      ok: true,
      message: "Logout successful",
    });

    // Clear the admin_token cookie
    response.cookies.set("admin_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0, // Expire immediately
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
