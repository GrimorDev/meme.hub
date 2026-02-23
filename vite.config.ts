import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icons/favicon.ico', 'icons/apple-touch-icon-180x180.png', 'icons/pwa-192x192.png', 'icons/pwa-512x512.png'],
          manifest: {
            name: 'MEME.HUB',
            short_name: 'Meme.Hub',
            description: 'Twoja Fabryka Mocy — najśmieszniejsze memy w jednym miejscu',
            theme_color: '#a855f7',
            background_color: '#0a0a0c',
            display: 'standalone',
            orientation: 'portrait-primary',
            start_url: '/',
            scope: '/',
            lang: 'pl',
            icons: [
              { src: '/icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
              { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
              { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
            runtimeCaching: [
              {
                urlPattern: /^\/api\//,
                handler: 'NetworkFirst',
                options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
              },
              {
                urlPattern: /^\/uploads\//,
                handler: 'CacheFirst',
                options: { cacheName: 'uploads-cache', expiration: { maxEntries: 200, maxAgeSeconds: 604800 } },
              },
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
