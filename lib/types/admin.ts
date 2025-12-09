/**
 * Serialized admin type for client components
 * This is a plain object version of IAdminUser that can be passed from Server to Client Components
 */
export interface SerializedAdmin {
  _id: string;
  email: string;
  role: "super_admin" | "admin" | "presenter";
  mustChangePassword: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}
