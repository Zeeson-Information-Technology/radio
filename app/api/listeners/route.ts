import { NextResponse } from 'next/server';

/**
 * GET /api/listeners
 * Fetch current listener count.
 * - Local dev: reads from gateway /listeners/count (real active stream connections)
 * - Production: reads from Icecast /status-json.xsl stats
 */
export async function GET() {
  try {
    const streamUrl = process.env.STREAM_URL || '';
    const isLocalDev = process.env.NODE_ENV === 'development' || streamUrl.includes('localhost');

    // ── Local dev: ask the gateway directly ─────────────────────────────────
    if (isLocalDev) {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${gatewayUrl}/listeners/count`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ ok: true, listeners: data.listeners ?? 0, source: 'gateway' });
        }
      } catch {
        // gateway not reachable — fall through to return 0
      }
      return NextResponse.json({ ok: true, listeners: 0, source: 'gateway-unavailable' });
    }

    // ── Production: read from Icecast stats ──────────────────────────────────
    if (!streamUrl || streamUrl.includes('example.com')) {
      return NextResponse.json({ ok: true, listeners: 0, configured: false });
    }

    const statsUrl = streamUrl.replace(/\/[^/]*$/, '/status-json.xsl');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(statsUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const listeners =
          data?.icestats?.source?.listeners ??
          data?.icestats?.source?.[0]?.listeners ??
          0;
        return NextResponse.json({ ok: true, listeners, configured: true, source: 'icecast' });
      }
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ ok: true, listeners: 0, configured: true, error: 'timeout' });
      }
      throw fetchError;
    }

    return NextResponse.json({ ok: true, listeners: 0, configured: true });

  } catch (error: any) {
    console.error('Error fetching listener count:', error);
    return NextResponse.json({ ok: true, listeners: 0, error: error.message });
  }
}
