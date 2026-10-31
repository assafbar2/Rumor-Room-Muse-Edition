import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const basePath = process.env.PAGES_BASE_PATH ?? '/play';
const url = process.env.PERF_URL || `http://127.0.0.1:4174${basePath}/`;
let server;
let browser;
try {
  if (!process.env.PERF_URL) {
    server = spawn(process.execPath, ['scripts/serve-export.mjs'], {
      env: { ...process.env, PORT: '4174', PAGES_BASE_PATH: basePath },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview server did not start.')), 10_000);
      server.stdout.once('data', () => {
        clearTimeout(timer);
        resolve();
      });
      server.once('error', reject);
      server.once('exit', (code) => {
        if (code) reject(new Error(`Preview exited: ${code}`));
      });
    });
  }
  browser = await chromium.launch();
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 100,
      downloadThroughput: 1_250_000,
      uploadThroughput: 625_000,
      connectionType: 'cellular4g',
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__rumorLcp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__rumorLcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000); // Let late paint observations settle without interacting.
    const sample = await page.evaluate(() => ({
      lcpMs: window.__rumorLcp,
      transferBytes: performance
        .getEntriesByType('resource')
        .reduce((n, r) => n + r.transferSize, 0),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    if (!sample.lcpMs) throw new Error('No LCP observation was recorded.');
    runs.push(sample);
    await context.close();
  }
  const medianLcpMs = [...runs].sort((a, b) => a.lcpMs - b.lcpMs)[1].lcpMs;
  const report = {
    measuredAt: new Date().toISOString(),
    url,
    browser: browser.version(),
    viewport: '390×844',
    downloadMbps: 10,
    latencyMs: 100,
    cpuSlowdown: 4,
    cache: 'cold',
    runs,
    medianLcpMs,
    targetMs: 3000,
    pass: medianLcpMs <= 3000 && runs.every((r) => !r.overflow),
  };
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/performance.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill();
}
