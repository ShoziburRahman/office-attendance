import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Stamp Kini',
    short_name: 'Stamp Kini',
    description: 'Stamp Kini Attendance Management',
    start_url: '/employee',
    display: 'standalone',
    scope: '/',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0d9488', // teal-600
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
