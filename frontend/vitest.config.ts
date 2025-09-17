import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/setupTests.ts'],
    exclude: ['e2e/**'],
    coverage: {
      provider: 'v8', // ✅ now installed
      reporter: ['text', 'lcov'], // or whatever you prefer
      // thresholds: { lines: 0.3, functions: 0.3, branches: 0.3, statements: 0.3 }
    }
  }
});