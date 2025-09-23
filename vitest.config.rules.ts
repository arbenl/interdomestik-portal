import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules/__tests__/**/*.test.ts'],
    reporters: ['default'],
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } } // emulator-friendly
  }
});
