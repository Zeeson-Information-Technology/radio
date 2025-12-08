import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import PresentersList from "./PresentersList";

/**
 * Presenters management page (Admin only)
 */
export default async function PresentersPage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  // Check if user is admin
  if (admin.role !== "admin") {
    redirect("/admin/live");
  }

  return <PresentersList />;
}
