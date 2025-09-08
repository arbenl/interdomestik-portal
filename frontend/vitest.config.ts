import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      all: true,
      lines: 75,
      functions: 75,
      branches: 75,
      statements: 75,
    },
  },
});

