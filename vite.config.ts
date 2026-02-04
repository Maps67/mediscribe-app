import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // CAMBIO 1: Agregamos explícitamente los iconos PWA aquí para forzar su inclusión
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 
      },

      manifest: {
        name: 'VitalScribe AI',
        short_name: 'VitalScribe',
        description: 'Asistente Médico Inteligente',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            // CAMBIO 2: Quitamos la barra '/' inicial. 
            // Esto hace que la ruta sea relativa al manifiesto generado.
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'sonner', 'date-fns'],
          db: ['@supabase/supabase-js'],
          pdf: ['@react-pdf/renderer'],
          ai: ['@google/generative-ai']
        }
      }
    }
  }
});