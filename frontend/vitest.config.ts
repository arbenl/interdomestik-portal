import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.?(c|m)[tj]s?(x)'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      'src/**/__legacy_tests__/**',
    ],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    isolate: true,
    sequence: { concurrent: false },
    testTimeout: 10000,
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 0.3,
        functions: 0.3,
        branches: 0.3,
        statements: 0.3,
      },
    },
  },
});
