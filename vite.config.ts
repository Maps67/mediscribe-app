import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // CAMBIO: 'prompt' permite avisar al usuario
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'MediScribe AI - Asistente Clínico',
        short_name: 'MediScribe',
        description: 'Plataforma médica inteligente para gestión de expedientes y recetas con IA.',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true // Permite probar el PWA en desarrollo local si se requiere
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1600,
  },
  define: {
    global: 'window',
  }
});