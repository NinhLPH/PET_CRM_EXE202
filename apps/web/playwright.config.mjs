import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: process.env.E2E_WEB_ORIGIN || 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Asia/Ho_Chi_Minh',
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Raw traces/HAR include session cookies and passwords. Store sanitized evidence instead.
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
});
