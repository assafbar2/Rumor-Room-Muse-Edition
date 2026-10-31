import { spawnSync } from 'node:child_process';

// A deliberately unusable credential enables the UI for intercepted fixtures only.
// The suite never sends a successful request to a model provider.
const env = {
  ...process.env,
  AI_ENABLED: 'true',
  OPENROUTER_API_KEY: 'fixture-only-not-a-real-key',
  APP_ORIGIN: 'http://127.0.0.1:4180',
  RUMOR_STATIC_EXPORT: '0',
  PAGES_BASE_PATH: '',
};
for (const args of [
  ['node_modules/next/dist/bin/next', 'build'],
  ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.live.config.ts'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
