import { cookies } from "next/headers";
import { verifyAuthToken } from "./auth";
import { connectDB } from "./db";
import AdminUser, { IAdminUser } from "./models/AdminUser";

/**
 * Server-side authentication utilities
 * For use in server components and API routes
 */

const ADMIN_TOKEN_COOKIE = "admin_token";

/**
 * Get the current authenticated admin from cookies
 * @returns The authenticated admin user or null if not authenticated
 */
export async function getCurrentAdmin(): Promise<IAdminUser | null> {
  try {
    // Get cookies
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;

    if (!token) {
      return null;
    }

    // Verify token
    const payload = verifyAuthToken(token);
    if (!payload) {
      return null;
    }

    // Connect to database
    await connectDB();

    // Find admin user
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return null;
    }

    return admin;
  } catch (error) {
    console.error("Error getting current admin:", error);
    return null;
  }
}

/**
 * Check if a user is authenticated
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return admin !== null;
}

/**
 * Check if the current admin has permission to upload audio
 * @returns True if has permission, false otherwise
 */
export async function canUploadAudio(): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return admin !== null && (admin.role === "super_admin" || admin.role === "admin");
}

/**
 * Check if the current admin is a super admin
 * @returns True if super admin, false otherwise
 */
export async function isSuperAdmin(): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return admin !== null && admin.role === "super_admin";
}
