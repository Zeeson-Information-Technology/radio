"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [isLive, setIsLive] = useState(false);
  const [scheduleCount, setScheduleCount] = useState(0);

  useEffect(() => {
    // Fetch live status
    fetch('/api/live')
      .then(res => res.json())
      .then(data => setIsLive(data.isLive))
      .catch(() => {});

    // Fetch schedule count
    fetch('/api/schedule')
      .then(res => res.json())
      .then(data => setScheduleCount(data.items?.length || 0))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section - Traditional Islamic Design */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white overflow-hidden">
        {/* Traditional Islamic Geometric Pattern Background */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Cpath d='M40 0l10 10-10 10-10-10L40 0zm0 20l10 10-10 10-10-10 10-10zm0 20l10 10-10 10-10-10 10-10zm0 20l10 10-10 10-10-10 10-10zM0 40l10 10-10 10-10-10L0 40zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>

        {/* Gold Border Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent opacity-60"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            {/* Live Indicator */}
            {isLive && (
              <div className="inline-flex items-center gap-2 bg-emerald-950/40 backdrop-blur-sm border-2 border-yellow-600/40 rounded-lg px-5 py-2 mb-8">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
                <span className="text-sm font-bold text-yellow-100 tracking-wide">LIVE NOW</span>
              </div>
            )}

            {/* Main Heading with Traditional Styling */}
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-3 text-white leading-tight tracking-wide px-4">
              Al-Manhaj Radio
            </h1>
            
            {/* Arabic Name with Gold Styling */}
            <p 
              className="text-2xl sm:text-3xl md:text-4xl mb-6 sm:mb-8 font-bold tracking-wider px-4" 
              style={{ 
                fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
                direction: 'rtl',
                color: '#D4AF37',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}
            >
              إذاعة المنهج
            </p>
            
            {/* Decorative Divider */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-12 sm:w-16 h-0.5 bg-gradient-to-r from-transparent to-yellow-600/60"></div>
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rotate-45 bg-yellow-600/60"></div>
              <div className="w-12 sm:w-16 h-0.5 bg-gradient-to-l from-transparent to-yellow-600/60"></div>
            </div>
            
            <p className="text-lg sm:text-xl md:text-2xl text-emerald-50 mb-3 sm:mb-4 max-w-3xl mx-auto leading-relaxed font-medium px-4">
              Authentic Islamic Knowledge Following the Way of the Salaf
            </p>
            
            <p className="text-sm sm:text-base md:text-lg text-emerald-100/80 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
              Listen to enlightening lectures, Quran recitations, and beneficial knowledge upon the understanding of the righteous predecessors
            </p>

            {/* CTA Buttons - Traditional Style */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link
                href="/radio"
                className="group relative inline-flex items-center justify-center gap-3 bg-emerald-700 hover:bg-emerald-600 text-white px-10 py-4 rounded-lg border-2 border-yellow-600/30 hover:border-yellow-600/50 transition-all duration-300 text-lg font-bold shadow-lg hover:shadow-xl"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                Listen Now
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              
              <Link
                href="/library"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white px-8 py-4 rounded-xl hover:bg-white/20 transition-all duration-300 text-lg font-semibold"
              >
                Browse Audio Library
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t border-white/10">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-emerald-300">24/7</div>
                <div className="text-sm text-emerald-200/70 mt-1">Always On</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-emerald-300">{scheduleCount >= 10 ? `${scheduleCount}+` : '10+'}</div>
                <div className="text-sm text-emerald-200/70 mt-1">Weekly Programs</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-emerald-300">HD</div>
                <div className="text-sm text-emerald-200/70 mt-1">Audio Quality</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Why Choose Al-Manhaj Radio?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Experience authentic Islamic content delivered with excellence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border border-emerald-100 hover:border-emerald-300 hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Live Lectures</h3>
                <p className="text-slate-600 leading-relaxed">
                  Join live sessions with knowledgeable scholars. Engage with authentic Islamic teachings in real-time.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border border-amber-100 hover:border-amber-300 hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">24/7 Content</h3>
                <p className="text-slate-600 leading-relaxed">
                  Access our extensive library of recorded lectures and Quran recitations anytime, anywhere.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border border-purple-100 hover:border-purple-300 hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-indigo-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">HD Quality</h3>
                <p className="text-slate-600 leading-relaxed">
                  Crystal clear audio streaming ensures you don't miss a single word of wisdom and guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule Preview Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Weekly Schedule
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Plan your listening with our organized program schedule
            </p>
            <Link
              href="/radio"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-lg group"
            >
              View Full Schedule
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg mb-1">Tafsir Sessions</h3>
                  <p className="text-slate-600 text-sm mb-2">Quranic interpretation and understanding</p>
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Multiple times weekly</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg mb-1">Hadith Studies</h3>
                  <p className="text-slate-600 text-sm mb-2">Prophetic traditions and teachings</p>
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Check schedule for times</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-br from-emerald-900 via-teal-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Start Your Spiritual Journey Today
          </h2>
          <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
            Join thousands of listeners seeking knowledge and strengthening their faith through authentic Islamic content
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/radio"
              className="inline-flex items-center justify-center gap-2 bg-white text-emerald-900 px-10 py-5 rounded-xl hover:bg-emerald-50 transition-all duration-300 text-lg font-bold shadow-2xl hover:scale-105"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Listen Live
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center justify-center gap-2 bg-emerald-800 text-white border-2 border-emerald-600 px-10 py-5 rounded-xl hover:bg-emerald-700 hover:border-emerald-500 transition-all duration-300 text-lg font-bold shadow-2xl hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              📚 Explore Library
            </Link>
          </div>
        </div>
      </section>

      {/* Traditional Islamic Footer */}
      <footer className="relative bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-stone-200 py-12 sm:py-16 overflow-hidden">
        {/* Traditional Islamic Pattern Background */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Cpath d='M40 0l10 10-10 10-10-10L40 0zm0 20l10 10-10 10-10-10 10-10zm0 20l10 10-10 10-10-10 10-10zm0 20l10 10-10 10-10-10 10-10zM0 40l10 10-10 10-10-10L0 40zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10zm20 0l10 10-10 10-10-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>

        {/* Gold top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent opacity-60"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12 mb-8 sm:mb-12">
            {/* Logo and Description */}
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
                <div className="w-12 sm:w-14 h-12 sm:h-14">
                  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="footerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                      <linearGradient id="footerGold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#E5C158" />
                      </linearGradient>
                    </defs>
                    <path d="M 60 10 L 85 20 L 110 45 L 110 75 L 85 100 L 35 100 L 10 75 L 10 45 L 35 20 Z" fill="url(#footerGradient)" stroke="url(#footerGold)" strokeWidth="2"/>
                    <path d="M 60 20 L 80 28 L 100 48 L 100 72 L 80 92 L 40 92 L 20 72 L 20 48 L 40 28 Z" fill="none" stroke="url(#footerGold)" strokeWidth="1.5" opacity="0.6"/>
                    <g transform="translate(60, 60)">
                      <path d="M 0,-25 L -5,-8 L -20,-10 L -8,-3 L -12,10 L 0,0 L 12,10 L 8,-3 L 20,-10 L 5,-8 Z" fill="white" opacity="0.95"/>
                      <path d="M 0,-8 L -8,0 L 0,8 L 8,0 Z" fill="url(#footerGold)"/>
                      <circle cx="0" cy="0" r="3" fill="white"/>
                    </g>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-white font-bold text-xl leading-tight">Al-Manhaj Radio</h3>
                  <p 
                    className="text-base leading-tight font-semibold" 
                    style={{ 
                      fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
                      direction: 'rtl',
                      color: '#D4AF37'
                    }}
                  >
                    إذاعة المنهج
                  </p>
                </div>
              </div>
              <p className="text-sm text-stone-300 leading-relaxed mb-3">
                Authentic Islamic knowledge following the way of the Salaf as-Saalih (righteous predecessors).
              </p>
              <p 
                className="text-sm leading-relaxed" 
                style={{ 
                  fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
                  direction: 'rtl',
                  color: '#D4AF37'
                }}
              >
                على منهج السلف الصالح
              </p>
            </div>

            {/* Quick Links */}
            <div className="text-center sm:text-left">
              <h4 className="text-white font-bold mb-4 text-base sm:text-lg border-b-2 border-yellow-600/30 pb-2 inline-block">Quick Links</h4>
              <ul className="space-y-2 sm:space-y-3 text-sm">
                <li>
                  <Link href="/radio" className="flex items-center gap-2 hover:text-yellow-400 transition-colors group justify-center sm:justify-start">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rotate-45 group-hover:scale-125 transition-transform"></span>
                    Listen Live
                  </Link>
                </li>
                <li>
                  <Link href="/library" className="flex items-center gap-2 hover:text-yellow-400 transition-colors group justify-center sm:justify-start">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rotate-45 group-hover:scale-125 transition-transform"></span>
                    Audio Library
                  </Link>
                </li>
                <li>
                  <Link href="/radio" className="flex items-center gap-2 hover:text-yellow-400 transition-colors group justify-center sm:justify-start">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rotate-45 group-hover:scale-125 transition-transform"></span>
                    Schedule
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="flex items-center gap-2 hover:text-yellow-400 transition-colors group justify-center sm:justify-start">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rotate-45 group-hover:scale-125 transition-transform"></span>
                    Admin Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* About */}
            <div className="text-center sm:text-left sm:col-span-2 md:col-span-1">
              <h4 className="text-white font-bold mb-4 text-base sm:text-lg border-b-2 border-yellow-600/30 pb-2 inline-block">Our Mission</h4>
              <p className="text-sm text-stone-300 leading-relaxed">
                Broadcasting authentic Islamic lectures, Quran recitations, and beneficial knowledge upon the understanding of the Salaf.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500 justify-center sm:justify-start">
                <div className="w-2 h-2 bg-yellow-600 rotate-45"></div>
                <span>Following the Prophetic Methodology</span>
              </div>
            </div>
          </div>

          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-16 sm:w-24 h-0.5 bg-gradient-to-r from-transparent to-yellow-600/40"></div>
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rotate-45 bg-yellow-600/60"></div>
            <div className="w-16 sm:w-24 h-0.5 bg-gradient-to-l from-transparent to-yellow-600/40"></div>
          </div>

          {/* Copyright */}
          <div className="text-center text-xs sm:text-sm text-stone-400 px-4">
            <p className="mb-2">&copy; {new Date().getFullYear()} Al-Manhaj Radio. All rights reserved.</p>
            <p 
              className="text-xs" 
              style={{ 
                fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
                direction: 'rtl',
                color: '#D4AF37'
              }}
            >
              جزاكم الله خيرا - May Allah reward you with goodness
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
