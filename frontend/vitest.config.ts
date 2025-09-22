import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.ts?(x)'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'src/**/__legacy_tests__/**'],
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: { lines: 0.3, functions: 0.3, branches: 0.3, statements: 0.3 }
    }
  }
});
