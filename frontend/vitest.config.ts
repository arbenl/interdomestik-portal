import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // ratchet up over time: 10 → 30 → 60
      lines: 30,
      functions: 30,
      branches: 30,
      statements: 30
    }
  }
});