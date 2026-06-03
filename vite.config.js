import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Macaco OS',
        short_name: 'Macaco',
        description: 'Gestión Macaco Suplementos — ventas, inventario, finanzas',
        theme_color: '#F5C518',
        background_color: '#0A0A0F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // NO cachear JS/CSS/HTML — siempre red para garantizar versión más nueva
        globPatterns: ['**/*.{png,svg,ico,woff,woff2}'],
        runtimeCaching: [
          {
            // Fuentes de Google: cache larga
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 } }
          },
          {
            // Supabase: siempre red, nunca cachear
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Todo lo demás (JS, CSS, HTML): NetworkFirst — red primero, cache como fallback
            urlPattern: /\.(js|css|html)$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'app-shell', networkTimeoutSeconds: 5 }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    open: true
  }
});
