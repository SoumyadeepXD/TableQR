import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TableQR — Contactless Dine-In Ordering & Billing',
    short_name: 'TableQR',
    description:
      'Scan table QR, order delicious food with no login, and pay via UPI. Fast, multi-restaurant QR dine-in SaaS for India.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#059669',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
