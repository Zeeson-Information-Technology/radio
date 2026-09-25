import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Al-Manhaj Radio',
    short_name: 'Al-Manhaj',
    description: 'Listen to authentic Islamic lectures following the prophetic methodology.',
    start_url: '/radio',
    display: 'standalone',        // No browser UI — fullscreen like a native app
    background_color: '#047857',  // Emerald green — matches your brand
    theme_color: '#059669',       // Status bar colour on Android
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        // favicon — used for small sizes
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        // Next.js generates this from app/icon.tsx
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        // Next.js generates this from app/apple-icon.tsx — 180x180
        // Used as the main app icon on Android and iOS
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Same icon used as maskable (Android adaptive icon)
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['music', 'education', 'lifestyle'],
    lang: 'en',
  };
}
