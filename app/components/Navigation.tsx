"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Traditional Islamic Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-50/98 backdrop-blur-sm shadow-md border-b-2 border-emerald-800/20">
        {/* Gold accent line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent opacity-60"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo with Traditional Design */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group z-50">
              <div className="w-9 h-9 sm:w-11 sm:h-11 group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="navGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#047857" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="navGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#C9A227" />
                    </linearGradient>
                  </defs>
                  <path d="M 60 10 L 85 20 L 110 45 L 110 75 L 85 100 L 35 100 L 10 75 L 10 45 L 35 20 Z" fill="url(#navGradient)" stroke="url(#navGold)" strokeWidth="2"/>
                  <path d="M 60 20 L 80 28 L 100 48 L 100 72 L 80 92 L 40 92 L 20 72 L 20 48 L 40 28 Z" fill="none" stroke="url(#navGold)" strokeWidth="1.5" opacity="0.6"/>
                  <g transform="translate(60, 60)">
                    <path d="M 0,-25 L -5,-8 L -20,-10 L -8,-3 L -12,10 L 0,0 L 12,10 L 8,-3 L 20,-10 L 5,-8 Z" fill="white" opacity="0.95"/>
                    <path d="M 0,-8 L -8,0 L 0,8 L 8,0 Z" fill="url(#navGold)"/>
                    <circle cx="0" cy="0" r="3" fill="white"/>
                  </g>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg leading-tight text-emerald-900">
                  Al-Manhaj Radio
                </span>
                <span 
                  className="text-[10px] sm:text-xs leading-tight font-semibold hidden xs:block" 
                  style={{ 
                    fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
                    direction: 'rtl',
                    color: '#D4AF37'
                  }}
                >
                  إذاعة المنهج
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/"
                className="px-5 py-2 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all duration-200 font-semibold border border-transparent hover:border-emerald-200"
              >
                Home
              </Link>
              <Link
                href="/radio"
                className="px-5 py-2 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all duration-200 font-semibold border border-transparent hover:border-emerald-200"
              >
                Listen Live
              </Link>
              <Link
                href="/library"
                className="px-5 py-2 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all duration-200 font-semibold border border-transparent hover:border-emerald-200"
              >
                📚 Library
              </Link>
              <Link
                href="/admin/login"
                className="px-5 py-2 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all duration-200 font-semibold border border-transparent hover:border-emerald-200"
              >
                Admin
              </Link>
            </div>

            {/* CTA Button & Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/radio"
                className="hidden sm:inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-4 lg:px-6 py-2.5 rounded-md border-2 border-yellow-600/30 hover:border-yellow-600/50 transition-all duration-300 font-bold shadow-md text-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                <span className="hidden lg:inline">Listen Now</span>
              </Link>

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors z-50"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div 
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pt-2 pb-6 space-y-2 bg-stone-50 border-t border-emerald-800/10">
            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-yellow-600/40"></div>
              <div className="w-1.5 h-1.5 rotate-45 bg-yellow-600/60"></div>
              <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-yellow-600/40"></div>
            </div>

            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all duration-200 font-semibold border-2 border-transparent hover:border-emerald-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-yellow-600 rotate-45"></div>
                Home
              </div>
            </Link>
            
            <Link
              href="/radio"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all duration-200 font-semibold border-2 border-transparent hover:border-emerald-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-yellow-600 rotate-45"></div>
                Listen Live
              </div>
            </Link>
            
            <Link
              href="/library"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all duration-200 font-semibold border-2 border-transparent hover:border-emerald-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-yellow-600 rotate-45"></div>
                📚 Audio Library
              </div>
            </Link>
            
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all duration-200 font-semibold border-2 border-transparent hover:border-emerald-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-yellow-600 rotate-45"></div>
                Admin Portal
              </div>
            </Link>

            {/* Mobile CTA Button */}
            <div className="pt-3">
              <Link
                href="/radio"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-emerald-800 hover:bg-emerald-700 text-white px-6 py-3 rounded-md border-2 border-yellow-600/30 hover:border-yellow-600/50 transition-all duration-300 font-bold shadow-md"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                Listen Now
              </Link>
            </div>

            {/* Arabic text in mobile menu */}
            <div className="pt-3 text-center">
              <p 
                className="text-sm font-semibold" 
                style={{ 
                  fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
                  direction: 'rtl',
                  color: '#D4AF37'
                }}
              >
                إذاعة المنهج - على منهج السلف الصالح
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay when mobile menu is open */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
