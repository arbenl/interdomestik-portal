import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  envDir: '..',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
