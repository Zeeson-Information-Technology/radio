"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Presenter {
  _id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function PresentersList() {
  const [presenters, setPresenters] = useState<Presenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-16">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  User Management
                </h1>
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

          {/* Content Area */}
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
                <Link
                  href="/admin/presenters/new"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Create your first user
                </Link>
              </div>
            ) : (
              <>
                {/* Desktop Table View (hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Created
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Last Login
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {presenters.map((presenter) => (
                        <tr
                          key={presenter._id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 font-medium text-gray-900">{presenter.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                presenter.role === "super_admin"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : presenter.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {presenter.role === "super_admin" ? "Super Admin" : presenter.role === "admin" ? "Admin" : "Presenter"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {formatDate(presenter.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {formatDate(presenter.lastLoginAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (hidden on desktop) */}
                <div className="md:hidden space-y-4">
                  {presenters.map((presenter) => (
                    <div
                      key={presenter._id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Header Row */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {presenter.email}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              presenter.role === "super_admin"
                                ? "bg-yellow-100 text-yellow-800"
                                : presenter.role === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {presenter.role === "super_admin" ? "Super Admin" : presenter.role === "admin" ? "Admin" : "Presenter"}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Created:</span>
                          <span className="text-gray-900">{formatDate(presenter.createdAt)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Last Login:</span>
                          <span className="text-gray-900">{formatDate(presenter.lastLoginAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
