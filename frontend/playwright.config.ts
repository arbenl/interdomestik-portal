import { defineConfig, devices } from '@playwright/test';

const reuse = !process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    // Start Firebase emulators (includes Auth/Functions/Firestore).
    {
      command: 'pnpm -C .. dev:emu', // run workspace root emulator script
      url: 'http://localhost:4000', // emulator UI (or any port that guarantees it’s up)
      reuseExistingServer: reuse,
      timeout: 90_000,
    },
    // Start Vite dev server
    {
      command: 'pnpm dev:e2e', // `vite` with --host localhost
      url: 'http://localhost:5173',
      reuseExistingServer: reuse,
      timeout: 90_000,
      env: {
        VITE_FF_DASHBOARD: 'true',
        VITE_FLAG_ALERT_WORKFLOW: 'true',
      },
    },
  ],
  globalSetup: './e2e/global-setup.ts',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
