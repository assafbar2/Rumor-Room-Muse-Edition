import { spawnSync } from 'node:child_process';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base =
  process.env.PAGES_BASE_PATH ??
  (repoName && !repoName.endsWith('.github.io') ? `/${repoName}` : '');
if (base && !/^\/[a-zA-Z0-9_.-]+$/.test(base))
  throw new Error('PAGES_BASE_PATH must be empty or one safe path segment.');
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, RUMOR_STATIC_EXPORT: '1', PAGES_BASE_PATH: base, AI_ENABLED: 'false' },
});
process.exit(result.status ?? 1);
