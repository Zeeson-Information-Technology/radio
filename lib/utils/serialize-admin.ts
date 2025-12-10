import { IAdminUser } from "@/lib/models/AdminUser";
import { SerializedAdmin } from "@/lib/types/admin";

/**
 * Serialize admin user object for passing to Client Components
 * Converts Mongoose document to plain object
 */
export function serializeAdmin(admin: IAdminUser): SerializedAdmin {
  return {
    _id: admin._id.toString(),
    name: admin.name || "Unknown",
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
    createdAt: admin.createdAt?.toISOString(),
    lastLoginAt: admin.lastLoginAt?.toISOString(),
  };
}
