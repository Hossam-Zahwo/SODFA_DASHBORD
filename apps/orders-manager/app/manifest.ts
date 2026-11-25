import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'HOMEY & SODFA | مدير الأوردرات',
    short_name: 'HOMEY & SODFA',
    description: 'لوحة إدارة وتأكيد أوردرات هومي وصدفة',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#ffffff',
    orientation: 'any',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/sodfa-app-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/sodfa-app-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
