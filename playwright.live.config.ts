import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/live',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4180/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-live',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-live',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 4180',
    url: 'http://127.0.0.1:4180/',
    reuseExistingServer: false,
    env: {
      AI_ENABLED: 'true',
      OPENROUTER_API_KEY: 'fixture-only-not-a-real-key',
      APP_ORIGIN: 'http://127.0.0.1:4180',
    },
    timeout: 30_000,
  },
});
