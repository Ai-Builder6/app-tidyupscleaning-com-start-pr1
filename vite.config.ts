import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        selfDestroying: true,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'TidyUps Cleaning & Dispatch Genie',
          short_name: 'TidyUps',
          description: 'TidyUps Cleaning, EasyCleans & Dispatch Genie operations console, live field service dispatch board, automated scheduling, and Jobber sync.',
          theme_color: '#2563EB',
          background_color: '#F8FAFC',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(
        process.env.VITE_GOOGLE_MAPS_API_KEY ||
        process.env.VITEGOOGLE_MAPS_API_KEY ||
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.MAPS_API_KEY ||
        ''
      ),
      'import.meta.env.VITE_GOOGLE_MAPS_MAP_ID': JSON.stringify(
        process.env.VITE_GOOGLE_MAPS_MAP_ID ||
        process.env.GOOGLE_MAPS_MAP_ID ||
        '2bd06c0db10a0a3ccd4c8603'
      ),
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
