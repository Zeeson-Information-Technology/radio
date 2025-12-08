import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import LoginForm from "./LoginForm";

/**
 * Admin login page
 * Redirects to /admin/live if already authenticated
 */
export default async function AdminLoginPage() {
  // Check if user is already logged in
  const admin = await getCurrentAdmin();

  if (admin) {
    // Already authenticated, redirect to admin dashboard
    redirect("/admin/live");
  }

  // Not authenticated, show login form
  return <LoginForm />;
}
