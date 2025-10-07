import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import react from '@vitejs/plugin-react';

// Proxy functions emulator traffic to avoid CORS issues during local development
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'interdomestik-dev';
const functionsRegion = 'europe-west1';
const functionsEmuPort = 5001;

export default defineConfig({
  root: '.',
  envDir: '..',
  server: {
    proxy: {
      [`/${projectId}/${functionsRegion}`]: {
        target: `http://127.0.0.1:${functionsEmuPort}`,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    visualizer({
      open: process.env.ANALYZE === 'true',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions',
          ],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
