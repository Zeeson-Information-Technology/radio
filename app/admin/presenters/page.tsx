import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/server-auth";
import PresentersList from "./PresentersList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presenters Management",
  description: "Manage presenters and scholars for Al-Manhaj Radio.",
};

/**
 * Presenters management page (Admin only)
 */
export default async function PresentersPage() {
  // Check authentication
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  // Only super_admin and admin can manage users
  if (admin.role !== "super_admin" && admin.role !== "admin") {
    redirect("/admin/live");
  }

  return <PresentersList currentUser={{ _id: admin._id.toString(), role: admin.role }} />;
}
