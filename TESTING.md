# Verification

Use Node.js 22 or newer and install the locked dependencies with `npm ci`.

## Content, rules, and API boundaries

```sh
npm run check
```

This runs content/spec consistency, formatting, TypeScript, and Vitest. The tests exercise all 160 research outcomes, ten correct verdicts, thirty wrong picks, scoring, empty/duplicate lookups, source provenance, artifact dimensions, local-save recovery, cross-tab merging, pending requests, and provider validation. Model calls are stubbed; no credentials or paid API are used.

After editing case content, run `npm run assets` and `npm run content:sync` before checking. `SPEC.md` contains a generated appendix and is intentionally excluded from automatic formatting.

## Static browser checks

```sh
npx playwright install chromium
PAGES_BASE_PATH=/play npm run build:pages
npm run test:e2e
```

The suite starts the exported preview and tests desktop Chromium at 1440×900 and mobile Chromium at 390×844. On Linux CI, install Chromium with `npx playwright install --with-deps chromium`.

Every case plays through two research moves, source reading, its image clue, an interview, a confirmed verdict, and a saved 130-point receipt. Claim selection checks pointer and keyboard activation, repeated selection, research-heading focus and visible choices, and no turn spent until a research move is chosen. That path also runs with reduced motion enabled. Other checks cover wrong verdicts, independent cases, two tabs, reset/replay scopes, filters, keyboard dialogs, denied storage, reduced motion, and narrow-layout overflow. API interception verifies prepared play sends no inference requests.

Axe checks the shelf, investigation, receipt, and exhibit dialog. Screenshots appear in ignored `artifacts/desktop/` and `artifacts/mobile/`; failure traces appear in `test-results/`. Automated accessibility checks do not replace keyboard and visual inspection. Safari and Firefox are not part of the automated matrix.

To smoke-test a published site with this suite, set `PLAYWRIGHT_BASE_URL` to its full trailing-slash URL. It uses an isolated browser profile and only local saves.

## Optional live UI, with fixtures

```sh
npm run test:live
```

This builds the normal server target with an intentionally unusable key and starts it on port 4180. Browser routes intercept live submissions. Checks cover save-before-send, duplicate suppression, reading evidence while waiting, persisted replies, interrupted refreshes without resend, late responses after exit/replay, separate-tab saves, exhausted dispatches, and continued prepared play after failures. Real HTTP checks verify the server rejects wrong methods and origins before inference.

The command rebuilds `.next`; rebuild your preferred target afterward before using `npm start`. Static `out/` remains available. Do not run Next server and static builds concurrently in the same checkout.

## Mobile performance

After building the static `/play` export:

```sh
npm run perf
```

The script takes three cold-context mobile samples at 390×844, 10 Mbps download, 100 ms latency, and 4× CPU slowdown. It records LCP and overflow in `artifacts/performance.json` and fails if median LCP exceeds three seconds. Local preview serves uncompressed files. Results describe a controlled synthetic run, not field performance for every device or network.

Set `PERF_URL` to a public trailing-slash URL to measure that deployment under the same browser throttling.

## Recorded v1.0.0 baseline

Local verification on October 31, 2026, using Node 24.18.0 and Chromium 156.0.8078.4:

| Check                                                 | Result                                |
| ----------------------------------------------------- | ------------------------------------- |
| Content, spec consistency, formatting, and TypeScript | Passed                                |
| Unit/API checks                                       | 231 passed                            |
| Static desktop/mobile browser checks                  | 32 passed                             |
| Server desktop/mobile live fixtures                   | 18 passed, no funded calls            |
| Axe on catalog, investigation, receipt, and exhibit   | No violations in the tested states    |
| Normal server and subdirectory static builds          | Passed                                |
| Mobile local LCP samples                              | 380 ms, 376 ms, 376 ms; median 376 ms |

Desktop and phone screenshots were inspected. The browser suite also verifies 320, 768, and 1024 pixel layout widths. The performance samples use the throttling above and an uncompressed local export; they are not a production field-performance claim. CI uses Node 22.

## Release gate

The pull-request workflow runs the complete checks, static browser suite, and normal-server live fixtures without secrets. The publication workflow validates and exports the game before uploading the Pages artifact. Review screenshots, check documentation and branding, and smoke-test the deployed URL after publication.

A public live-AI launch has a separate gate in [SPEC.md](SPEC.md#8-verification-and-release): funded model availability, grounded-answer and injection evaluation, actual cost/latency, provider budget exhaustion, and Vercel rate limiting. That gate remains unrun without a real dedicated key. Live AI stays disabled in the complete static release.
