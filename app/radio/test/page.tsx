'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DiagnosticResult {
  timestamp: string;
  streamUrl: string;
  tests: {
    icecastServer?: any;
    streamMount?: any;
    icecastStats?: any;
    gateway?: any;
  };
  analysis?: {
    overallStatus: string;
    issues: string[];
    recommendations: string[];
  };
}

export default function StreamTestPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // Get current live state
      const liveResponse = await fetch('/api/live');
      const liveData = await liveResponse.json();
      setLiveData(liveData);

      // Run diagnostics
      const diagResponse = await fetch('/api/stream/diagnose');
      const diagData = await diagResponse.json();
      setDiagnostics(diagData);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <Link
            href="/radio"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Radio</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6">
            <h1 className="text-3xl font-bold text-white mb-2">Stream Diagnostics</h1>
            <p className="text-emerald-100">Test listener audio connectivity and stream health</p>
          </div>

          <div className="p-8">
            {/* Controls */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg transition-all disabled:opacity-50 font-semibold"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Running Tests...' : 'Run Diagnostics'}
              </button>

              {diagnostics && (
                <span className="text-sm text-slate-500">
                  Last updated: {new Date(diagnostics.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Current Live State */}
            {liveData && (
              <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Current Broadcast Status</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-slate-600">Status:</span>
                    <div className={`inline-flex items-center gap-2 ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      liveData.isLive ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${liveData.isLive ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                      {liveData.isLive ? 'LIVE' : 'OFFLINE'}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Stream URL:</span>
                    <code className="ml-2 text-sm bg-white px-2 py-1 rounded border">{liveData.streamUrl}</code>
                  </div>
                  {liveData.lecturer && (
                    <div>
                      <span className="text-sm font-medium text-slate-600">Lecturer:</span>
                      <span className="ml-2 text-sm">{liveData.lecturer}</span>
                    </div>
                  )}
                  {liveData.title && (
                    <div>
                      <span className="text-sm font-medium text-slate-600">Title:</span>
                      <span className="ml-2 text-sm">{liveData.title}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Diagnostics Results */}
            {diagnostics && (
              <div className="space-y-6">
                {/* Overall Status */}
                {diagnostics.analysis && (
                  <div className={`p-6 rounded-2xl border-2 ${getStatusColor(diagnostics.analysis.overallStatus)}`}>
                    <h3 className="text-lg font-bold mb-2">
                      Overall Status: {diagnostics.analysis.overallStatus.toUpperCase()}
                    </h3>
                    
                    {diagnostics.analysis.issues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Issues Found:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {diagnostics.analysis.issues.map((issue, index) => (
                            <li key={index} className="text-sm">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {diagnostics.analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {diagnostics.analysis.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Tests */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Icecast Server Test */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3">Icecast Server</h4>
                    {diagnostics.tests.icecastServer ? (
                      <div className="space-y-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                          diagnostics.tests.icecastServer.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {diagnostics.tests.icecastServer.available ? '✅ Available' : '❌ Unavailable'}
                        </div>
                        <div className="text-sm text-slate-600">
                          Status: {diagnostics.tests.icecastServer.status}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No data</div>
                    )}
                  </div>

                  {/* Stream Mount Test */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3">Stream Mount</h4>
                    {diagnostics.tests.streamMount ? (
                      <div className="space-y-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                          diagnostics.tests.streamMount.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {diagnostics.tests.streamMount.available ? '✅ Available' : '❌ Unavailable'}
                        </div>
                        <div className="text-sm text-slate-600">
                          Status: {diagnostics.tests.streamMount.status}
                        </div>
                        {diagnostics.tests.streamMount.contentType && (
                          <div className="text-sm text-slate-600">
                            Content-Type: {diagnostics.tests.streamMount.contentType}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No data</div>
                    )}
                  </div>

                  {/* Gateway Test */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3">Gateway</h4>
                    {diagnostics.tests.gateway ? (
                      <div className="space-y-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                          diagnostics.tests.gateway.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {diagnostics.tests.gateway.available ? '✅ Available' : '❌ Unavailable'}
                        </div>
                        {diagnostics.tests.gateway.data && (
                          <div className="text-sm text-slate-600">
                            Services: {Object.keys(diagnostics.tests.gateway.data.services || {}).join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No data</div>
                    )}
                  </div>

                  {/* Icecast Stats */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3">Icecast Stats</h4>
                    {diagnostics.tests.icecastStats ? (
                      <div className="space-y-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                          diagnostics.tests.icecastStats.available ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {diagnostics.tests.icecastStats.available ? '✅ Available' : '⚠️ Limited'}
                        </div>
                        {diagnostics.tests.icecastStats.data && (
                          <div className="text-sm text-slate-600">
                            Sources: {diagnostics.tests.icecastStats.data.icestats?.sources?.length || 0}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No data</div>
                    )}
                  </div>
                </div>

                {/* Raw Data (Collapsible) */}
                <details className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <summary className="font-bold text-slate-900 cursor-pointer">Raw Diagnostic Data</summary>
                  <pre className="mt-4 text-xs bg-white p-4 rounded border overflow-auto">
                    {JSON.stringify(diagnostics, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {/* Manual Tests */}
            <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
              <h3 className="text-lg font-bold text-blue-900 mb-4">Manual Tests</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-blue-800">1. Direct Stream Test:</span>
                  <a 
                    href={liveData?.streamUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Open stream URL in new tab
                  </a>
                </div>
                <div>
                  <span className="font-medium text-blue-800">2. Icecast Admin:</span>
                  <a 
                    href="http://98.93.42.61:8000/admin/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Check Icecast admin panel
                  </a>
                </div>
                <div>
                  <span className="font-medium text-blue-800">3. Gateway Health:</span>
                  <a 
                    href="http://98.93.42.61:8080/health" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Check gateway health
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}