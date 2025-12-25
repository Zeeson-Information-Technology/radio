'use client';

import Link from "next/link";

export default function Navigation() {
  return (
    <div className="flex items-center gap-6 mb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors group"
      >
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="font-medium">Back to Home</span>
      </Link>
      
      <Link
        href="/library"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors group"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="font-medium">📚 Audio Library</span>
      </Link>
    </div>
  );
}