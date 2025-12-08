import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Islamic Radio - Live Lectures",
  description: "Listen to live Islamic lectures and recorded content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
                <Link
                  href="/"
                  className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-green-600 transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/radio"
                  className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-green-600 transition-colors"
                >
                  Radio
                </Link>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-green-600 transition-colors"
                >
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
