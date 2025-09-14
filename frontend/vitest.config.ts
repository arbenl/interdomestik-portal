import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: [
      './src/tests/mocks/firestore.setup.ts',
      './src/setupTests.ts'
    ],

    // Include ONLY our app tests
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Exclude external and build outputs
    exclude: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      'e2e',
      'playwright-report',
      '**/*.d.ts'
    ],
  },
});