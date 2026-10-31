import { defineConfig, devices } from '@playwright/test';
const basePath = process.env.PAGES_BASE_PATH ?? '/play';
const external = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: external || `http://127.0.0.1:4173${basePath}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: 'npm run preview',
        url: `http://127.0.0.1:4173${basePath}/`,
        reuseExistingServer: !process.env.CI,
        env: { PORT: '4173', PAGES_BASE_PATH: basePath },
        timeout: 30_000,
      },
});
