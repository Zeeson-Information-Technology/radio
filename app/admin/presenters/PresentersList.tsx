"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/lib/contexts/ToastContext";
import { useConfirm } from "@/lib/hooks/useConfirm";

interface Presenter {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface PresentersListProps {
  currentUser?: {
    _id: string;
    role: string;
  };
}

// ── Edit modal state ─────────────────────────────────────────────────────────
interface EditState {
  user: Presenter;
  name: string;
  email: string;
  role: string;
}

export default function PresentersList({ currentUser }: PresentersListProps) {
  const [presenters, setPresenters] = useState<Presenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit modal
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchPresenters();
  }, []);

  const fetchPresenters = async () => {
    try {
      const response = await fetch("/api/admin/presenters");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to fetch presenters");
        setIsLoading(false);
        return;
      }
      setPresenters(data.presenters);
      setIsLoading(false);
    } catch (err) {
      console.error("Fetch presenters error:", err);
      setError("An error occurred while fetching presenters");
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Edit handlers ────────────────────────────────────────────────────────────

  const canEdit = (target: Presenter) => {
    if (!currentUser) return false;
    if (currentUser.role === "super_admin") return true;
    if (currentUser.role === "admin" && target.role === "presenter") return true;
    return false;
  };

  const openEdit = (user: Presenter) => {
    setEditError("");
    setEditState({ user, name: user.name, email: user.email, role: user.role });
  };

  const closeEdit = () => {
    if (isSaving) return;
    setEditState(null);
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editState) return;
    setEditError("");

    if (!editState.name.trim() || !editState.email.trim()) {
      setEditError("Name and email are required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/presenters/${editState.user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editState.name.trim(),
          email: editState.email.trim(),
          role: editState.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.error || "Failed to update user");
        return;
      }

      // Update local state
      setPresenters(prev =>
        prev.map(p => p._id === editState.user._id ? { ...p, ...data.user } : p)
      );

      showSuccess("User Updated", `${data.user.name} has been updated successfully`);
      setEditState(null);
    } catch (err) {
      console.error("Error updating user:", err);
      setEditError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete handler ───────────────────────────────────────────────────────────

  const handleDeleteUser = async (user: Presenter) => {
    if (currentUser?.role !== "super_admin") {
      showError("Permission Denied", "Only super admins can delete users");
      return;
    }
    if (user._id === currentUser?._id) {
      showError("Cannot Delete", "You cannot delete your own account");
      return;
    }

    const shouldDelete = await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete "${user.name}" (${user.email})?\n\nThis action cannot be undone.`,
      confirmText: "Delete User",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!shouldDelete) return;

    setDeletingId(user._id);
    try {
      const response = await fetch(`/api/admin/presenters?id=${user._id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        showSuccess("User Deleted", `${user.name} has been deleted successfully`);
        setPresenters(prev => prev.filter(p => p._id !== user._id));
      } else {
        const data = await response.json();
        showError("Delete Failed", data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showError("Delete Failed", "An error occurred while deleting the user");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Role badge helper ────────────────────────────────────────────────────────

  const roleBadge = (role: string) => {
    if (role === "super_admin")
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-900 border border-yellow-300">👑 Super Admin</span>;
    if (role === "admin")
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Admin</span>;
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Presenter</span>;
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-16">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">

          {/* Header */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">User Management</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Manage admins and presenters who can control the live stream
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link
                  href="/admin/live"
                  className="w-full sm:w-auto px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-center"
                >
                  Back to Dashboard
                </Link>
                <Link
                  href="/admin/presenters/new"
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-center"
                >
                  Add User
                </Link>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : presenters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No users yet</p>
                <Link href="/admin/presenters/new" className="text-green-600 hover:text-green-700 font-medium">
                  Create your first user
                </Link>
              </div>
            ) : (
              <>
                {/* ── Desktop table ─────────────────────────────────────────── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Login</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presenters.map((presenter) => (
                        <tr
                          key={presenter._id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            presenter.role === "super_admin"
                              ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                              : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className={`font-medium ${presenter.role === "super_admin" ? "text-yellow-900" : "text-gray-900"}`}>
                              {presenter.role === "super_admin" && "👑 "}{presenter.name}
                              {presenter._id === currentUser?._id && (
                                <span className="ml-2 text-xs text-gray-400">(you)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">{presenter.email}</div>
                          </td>
                          <td className="py-3 px-4">{roleBadge(presenter.role)}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{formatDate(presenter.createdAt)}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{formatDate(presenter.lastLoginAt)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {/* Edit button */}
                              {canEdit(presenter) && (
                                <button
                                  onClick={() => openEdit(presenter)}
                                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                  title="Edit user"
                                >
                                  ✏️ Edit
                                </button>
                              )}
                              {/* Delete button — super_admin only, not self */}
                              {currentUser?.role === "super_admin" && presenter._id !== currentUser?._id && (
                                <button
                                  onClick={() => handleDeleteUser(presenter)}
                                  disabled={deletingId === presenter._id}
                                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete user"
                                >
                                  {deletingId === presenter._id ? "Deleting…" : "🗑️ Delete"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile cards ──────────────────────────────────────────── */}
                <div className="md:hidden space-y-4">
                  {presenters.map((presenter) => (
                    <div
                      key={presenter._id}
                      className={`border rounded-lg p-4 shadow-sm ${
                        presenter.role === "super_admin"
                          ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${presenter.role === "super_admin" ? "text-yellow-900" : "text-gray-900"}`}>
                            {presenter.role === "super_admin" && "👑 "}{presenter.name}
                            {presenter._id === currentUser?._id && (
                              <span className="ml-2 text-xs text-gray-400">(you)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 truncate">{presenter.email}</div>
                        </div>
                        <div className="ml-4 flex-shrink-0">{roleBadge(presenter.role)}</div>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created:</span>
                          <span className="text-gray-900">{formatDate(presenter.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Login:</span>
                          <span className="text-gray-900">{formatDate(presenter.lastLoginAt)}</span>
                        </div>
                      </div>

                      {(canEdit(presenter) || (currentUser?.role === "super_admin" && presenter._id !== currentUser?._id)) && (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                          {canEdit(presenter) && (
                            <button
                              onClick={() => openEdit(presenter)}
                              className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                          )}
                          {currentUser?.role === "super_admin" && presenter._id !== currentUser?._id && (
                            <button
                              onClick={() => handleDeleteUser(presenter)}
                              disabled={deletingId === presenter._id}
                              className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              {deletingId === presenter._id ? "Deleting…" : "🗑️ Delete"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeEdit}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Edit User</h2>
            <p className="text-sm text-gray-500 mb-6">
              Update details for <span className="font-medium text-gray-700">{editState.user.name}</span>
            </p>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{editError}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editState.name}
                  onChange={e => setEditState(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Full name"
                  disabled={isSaving}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editState.email}
                  onChange={e => setEditState(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="email@example.com"
                  disabled={isSaving}
                />
              </div>

              {/* Role — only super_admin can change roles, and not their own */}
              {currentUser?.role === "super_admin" && editState.user._id !== currentUser?._id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editState.role}
                    onChange={e => setEditState(prev => prev ? { ...prev, role: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    disabled={isSaving}
                  >
                    <option value="presenter">Presenter</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Changing role takes effect on their next login.
                  </p>
                </div>
              )}

              {/* Role display only when admin editing a presenter */}
              {currentUser?.role === "admin" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    {roleBadge(editState.role)}
                    <span className="ml-2 text-xs text-gray-400">(only super admins can change roles)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving…
                  </span>
                ) : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
