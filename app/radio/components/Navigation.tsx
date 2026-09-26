'use client';

import Link from "next/link";

export default function Navigation() {
  return (
    <div className="flex items-center gap-4 mb-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors group text-sm"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="font-medium">Home</span>
      </Link>

      <span className="text-slate-300">·</span>

      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="font-medium">Library</span>
      </Link>
    </div>
  );
}
