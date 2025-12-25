"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/lib/contexts/ToastContext";

interface NewPresenterFormProps {
  currentUserRole: "super_admin" | "admin" | "presenter";
}

export default function NewPresenterForm({ currentUserRole }: NewPresenterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "presenter">("presenter");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/presenters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create presenter");
        setIsLoading(false);
        return;
      }

      // Success - show temp password
      setTempPassword(data.tempPassword);
      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Create presenter error:", err);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    showSuccess("Password Copied", "Password copied to clipboard!");
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {role === "admin" ? "Admin" : "Presenter"} Created Successfully!
            </h1>
            <p className="text-gray-600">
              Share the temporary password with the new user
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-700 mb-3">
              <strong>Email:</strong> {email}
            </p>
            <p className="text-sm text-gray-700 mb-3">
              <strong>Temporary Password:</strong>
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-4 py-3 rounded border border-gray-300 font-mono text-lg">
                {tempPassword}
              </code>
              <button
                onClick={copyToClipboard}
                className="px-4 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                title="Copy to clipboard"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Note:</strong> Share this temporary password securely with the presenter. 
              They can optionally change it later from the "Change Password" page.
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/admin/presenters/new"
              onClick={() => {
                setSuccess(false);
                setEmail("");
                setTempPassword("");
              }}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-center"
            >
              Create Another
            </Link>
            <Link
              href="/admin/presenters"
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-center"
            >
              View All Presenters
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create New User
        </h1>
        <p className="text-gray-600 mb-8">
          Add a new admin or presenter who can manage the live stream
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Sheikh Ahmad"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "presenter")}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="presenter">Presenter</option>
              {/* Only super_admin and admin can create admins */}
              {(currentUserRole === "super_admin" || currentUserRole === "admin") && (
                <option value="admin">Admin</option>
              )}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              {role === "admin" 
                ? "Admins can create presenters and manage schedules" 
                : "Presenters can manage live streams and change their password"}
            </p>
           
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ A temporary password will be generated automatically and shown after creation.
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/admin/presenters"
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Presenter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
