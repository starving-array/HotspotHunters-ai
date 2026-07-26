import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // CATALYST: Proxy is for local dev only. In production, VITE_API_BASE_URL is used directly.
    proxy: (process.env.NODE_ENV === 'production' || process.env.VITE_USE_DIRECT_API) ? undefined : {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'data-viz': ['recharts', 'react-force-graph-2d'],
          'maps': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
});
