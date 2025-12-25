/**
 * Audio Access Middleware
 * Middleware functions for protecting audio-related API endpoints
 * Requirements: 8.5, 8.6, 8.7
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import AudioAccessControlService, { AccessControlContext } from "@/lib/services/AudioAccessControl";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

/**
 * Authenticate user and add user context to request
 */
export async function authenticateUser(request: NextRequest): Promise<{
  user: AccessControlContext | null;
  response: NextResponse | null;
}> {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return {
        user: null,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      };
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return {
        user: null,
        response: NextResponse.json({ error: "Invalid token" }, { status: 401 })
      };
    }

    await connectDB();
    const admin = await AdminUser.findById(payload.userId);
    if (!admin) {
      return {
        user: null,
        response: NextResponse.json({ error: "User not found" }, { status: 401 })
      };
    }

    return {
      user: {
        userId: admin._id.toString(),
        userRole: admin.role,
        userEmail: admin.email
      },
      response: null
    };

  } catch (error) {
    console.error("Authentication error:", error);
    return {
      user: null,
      response: NextResponse.json({ error: "Authentication failed" }, { status: 500 })
    };
  }
}

/**
 * Check if user has access to a specific audio file
 */
export async function checkAudioAccess(
  audioId: string, 
  user: AccessControlContext
): Promise<{ hasAccess: boolean; response?: NextResponse }> {
  try {
    const accessControl = AudioAccessControlService.getInstance();
    const accessResult = await accessControl.checkAudioAccess(audioId, user);

    if (!accessResult.hasAccess) {
      return {
        hasAccess: false,
        response: NextResponse.json(
          { error: accessResult.reason || "Access denied" },
          { status: 403 }
        )
      };
    }

    return { hasAccess: true };

  } catch (error) {
    console.error("Access check error:", error);
    return {
      hasAccess: false,
      response: NextResponse.json(
        { error: "Access check failed" },
        { status: 500 }
      )
    };
  }
}

/**
 * Check if user can modify a specific audio file
 */
export async function checkModifyAccess(
  audioId: string, 
  user: AccessControlContext
): Promise<{ hasAccess: boolean; response?: NextResponse }> {
  try {
    const accessControl = AudioAccessControlService.getInstance();
    const accessResult = await accessControl.checkModifyAccess(audioId, user);

    if (!accessResult.hasAccess) {
      return {
        hasAccess: false,
        response: NextResponse.json(
          { error: accessResult.reason || "Modification not allowed" },
          { status: 403 }
        )
      };
    }

    return { hasAccess: true };

  } catch (error) {
    console.error("Modify access check error:", error);
    return {
      hasAccess: false,
      response: NextResponse.json(
        { error: "Access check failed" },
        { status: 500 }
      )
    };
  }
}

/**
 * Require specific role for access
 */
export function requireRole(
  user: AccessControlContext, 
  allowedRoles: string[]
): { hasAccess: boolean; response?: NextResponse } {
  if (!allowedRoles.includes(user.userRole)) {
    return {
      hasAccess: false,
      response: NextResponse.json(
        { error: `Access denied. Required roles: ${allowedRoles.join(', ')}` },
        { status: 403 }
      )
    };
  }

  return { hasAccess: true };
}

/**
 * Require admin or super admin role
 */
export function requireAdmin(user: AccessControlContext): { hasAccess: boolean; response?: NextResponse } {
  return requireRole(user, ['admin', 'super_admin']);
}

/**
 * Require super admin role only
 */
export function requireSuperAdmin(user: AccessControlContext): { hasAccess: boolean; response?: NextResponse } {
  return requireRole(user, ['super_admin']);
}

/**
 * Higher-order function to wrap API handlers with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AccessControlContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const { user, response } = await authenticateUser(request);
    
    if (!user || response) {
      return response!;
    }

    return handler(request, user, ...args);
  };
}

/**
 * Higher-order function to wrap API handlers with audio access check
 */
export function withAudioAccess<T extends any[]>(
  handler: (request: NextRequest, user: AccessControlContext, ...args: T) => Promise<NextResponse>,
  getAudioId: (request: NextRequest, ...args: T) => string
) {
  return withAuth(async (request: NextRequest, user: AccessControlContext, ...args: T): Promise<NextResponse> => {
    const audioId = getAudioId(request, ...args);
    const { hasAccess, response } = await checkAudioAccess(audioId, user);
    
    if (!hasAccess || response) {
      return response!;
    }

    return handler(request, user, ...args);
  });
}

/**
 * Higher-order function to wrap API handlers with modify access check
 */
export function withModifyAccess<T extends any[]>(
  handler: (request: NextRequest, user: AccessControlContext, ...args: T) => Promise<NextResponse>,
  getAudioId: (request: NextRequest, ...args: T) => string
) {
  return withAuth(async (request: NextRequest, user: AccessControlContext, ...args: T): Promise<NextResponse> => {
    const audioId = getAudioId(request, ...args);
    const { hasAccess, response } = await checkModifyAccess(audioId, user);
    
    if (!hasAccess || response) {
      return response!;
    }

    return handler(request, user, ...args);
  });
}

/**
 * Higher-order function to wrap API handlers with role requirement
 */
export function withRole<T extends any[]>(
  handler: (request: NextRequest, user: AccessControlContext, ...args: T) => Promise<NextResponse>,
  allowedRoles: string[]
) {
  return withAuth(async (request: NextRequest, user: AccessControlContext, ...args: T): Promise<NextResponse> => {
    const { hasAccess, response } = requireRole(user, allowedRoles);
    
    if (!hasAccess || response) {
      return response!;
    }

    return handler(request, user, ...args);
  });
}

/**
 * Utility function to clear access cache when audio permissions change
 */
export function clearAudioAccessCache(audioId?: string, userId?: string): void {
  const accessControl = AudioAccessControlService.getInstance();
  accessControl.clearCache(userId, audioId);
}