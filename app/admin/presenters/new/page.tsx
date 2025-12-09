import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import NewPresenterForm from "./NewPresenterForm";

/**
 * Create new presenter page (Admin only)
 */
export default async function NewPresenterPage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  // Only super_admin and admin can create users
  if (admin.role !== "super_admin" && admin.role !== "admin") {
    redirect("/admin/live");
  }

  return <NewPresenterForm currentUserRole={admin.role} />;
}
