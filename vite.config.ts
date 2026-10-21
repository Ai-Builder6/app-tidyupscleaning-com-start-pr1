import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
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
