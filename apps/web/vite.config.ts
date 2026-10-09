import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Guoguo Beans',
        short_name: 'Guoguo',
        description: 'Family check-in and bean rewards',
        theme_color: '#2D6A4F',
        background_color: '#F7F3E9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5180,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
