import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // selfDestroying: desregistra el SW viejo y borra todos los caches en el celular.
      // Permite que siempre cargue código fresco del servidor.
      // El manifest sigue funcionando para "Añadir a pantalla de inicio".
      selfDestroying: true,
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
    })
  ],
  server: {
    port: 3000,
    open: true
  }
});
