import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import ChangePasswordForm from "./ChangePasswordForm";

/**
 * Change password page
 * Requires authentication
 */
export default async function ChangePasswordPage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    // Not authenticated, redirect to login
    redirect("/admin/login");
  }

  // Render change password form
  return <ChangePasswordForm admin={admin} />;
}
