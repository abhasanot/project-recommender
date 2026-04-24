// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    // Generate source maps for easier debugging
    sourcemap: false,
    // Chunk size warning threshold (the project has many Radix UI deps)
    chunkSizeWarningLimit: 800,
  },

  server: {
    // Bind to all interfaces inside Docker dev containers
    host:        '0.0.0.0',
    port:        3000,
    strictPort:  true,

    // Proxy /api/* to the Flask backend.
    // In Docker dev mode: backend is reachable at http://backend:5000
    // In local dev mode:  backend is at http://localhost:5000 (default)
    proxy: {
      '/api': {
        target:       process.env.VITE_API_URL ?? 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
