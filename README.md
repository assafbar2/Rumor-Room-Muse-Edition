# Rumor Room

A little scandal. A lot of evidence.

[Play Rumor Room](https://assafbar2.github.io/Rumor-Room-Muse-Edition/) · [How to play](docs/PLAYING.md)

Ten fictional mysteries about glamorous people, suspicious stories, and the detail that changes everything. Read four claims, spend four research turns, interview a witness, inspect the exhibit, and call the bluff. All ten cases are complete without an account, API key, database, or paid service.

The game features an editorial green-and-paper design, original illustrations, responsive controls, keyboard-accessible dialogs, and local saved progress. Each case has a fixed solution; replay shuffles the claims, not the mystery.

## Run locally

Use Node.js 22 or newer (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). No environment file is needed for the complete prepared game.

For a normal production server:

```sh
npm run build
npm start
```

## Play

[Player instructions](docs/PLAYING.md) explain the research moves, witnesses, scoring, and saved progress. The in-game **How to play** button includes the same essentials without revealing solutions.

The collection spans tech, nightlife, romance, wine, fashion, auctions, hotels, music, yachts, and jewelry. Every person, organization, document, and incident is fictional. No score or solution is protected from someone inspecting the source; this is a casual puzzle game.

## Publish to GitHub Pages

GitHub Pages serves the entire ten-case game. It makes no inference requests and exposes no API key. The optional API is omitted from the export.

1. Set repository **Settings → Pages → Source → GitHub Actions**.
2. Push to `main`, or run the **Publish game** workflow manually.
3. Open the URL shown by the `github-pages` environment or workflow deployment.

The build derives its base path from `GITHUB_REPOSITORY`, so the repository can keep its existing slug. Hash navigation preserves cases across refreshes on a static host. There is no custom domain requirement.

To verify a subdirectory deployment locally:

```sh
PAGES_BASE_PATH=/play npm run build:pages
PAGES_BASE_PATH=/play npm run preview
```

Open [localhost:4173/play/](http://localhost:4173/play/). To host at the domain root, set `PAGES_BASE_PATH=''` for both commands. On GitHub, set the repository variable `PAGES_BASE_PATH` to `/` for a custom domain; the workflow translates it to an empty base path.

## Optional live witness on Vercel

Live questions are an optional server feature. They add no cases and are **disabled in the public static release**. Prepared questions and every solution remain available when AI is off or fails.

For a future live deployment, import the repository into Vercel using its Next.js preset and `npm run build`. Keep `AI_ENABLED=false` until the separate funded checks in [SPEC.md](SPEC.md#8-verification-and-release) pass. The only runtime settings are documented in `.env.example`:

| Setting              | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `AI_ENABLED`         | Explicit opt-in, `false` by default                       |
| `OPENROUTER_API_KEY` | Server-only, dedicated spending-limited key               |
| `APP_ORIGIN`         | Exact production origin, without a path or trailing slash |

The fixed model is `openai/gpt-6-astra`. The endpoint validates bounded inputs and outputs, permits one provider attempt, enforces a timeout, and never retries or switches models. No browser variable may contain a secret. A normal server build must be rebuilt after changing the live-UI settings.

Before public enablement, verify model access, grounded replies, actual billing/latency, a dedicated non-renewing budget (proposed starting allowance: $5), and Vercel's own endpoint rate limit (initially 6 requests per minute per IP). No Redis or additional bot service is required. Browser counters and Origin checks are not authentication; determined visitors can consume the shared allowance. Revoke the dedicated key or block the endpoint to stop inference. Hosting charges are separate.

Live-provider evaluation is not part of automated CI and has not been run with a funded key. The browser fixtures use an intentionally invalid credential and intercepted responses.

## Work on the game

The complete build contract and all ten case texts are in [SPEC.md](SPEC.md). Edit `content/cases.json` for content, then regenerate its prepared assets and the spec appendix:

```sh
npm run assets
npm run content:sync
npm run format
npm run check
```

The checks validate all claims, sources, testimony references, outcomes, timestamps, and image assets. The spec check prevents the single-file appendix drifting from the case pack. See [TESTING.md](TESTING.md) for browser, API, accessibility, and performance verification.

| Path                                     | Responsibility                                |
| ---------------------------------------- | --------------------------------------------- |
| `content/cases.json`                     | Authored evidence and solutions               |
| `lib/game/`                              | Schemas, deterministic rules, and local saves |
| `components/Game.tsx`, `app/`            | Interface and application shell               |
| `lib/server/witness.ts`, `pages/api/ai/` | Optional provider adapter                     |
| `public/`, `scripts/generate-assets.ts`  | Original prepared illustrations and exhibits  |
| `tests/`                                 | Rules, API boundaries, and browser flows      |

Saves belong to the current browser and origin. Clearing site data removes them; moving between localhost and the public site does not transfer them. Storage denial falls back to play for the current visit. Separate case changes from different tabs are merged; simultaneous edits to the same run use the last write. There is no analytics SDK or account sync.

## License

Code, case writing, and original artwork are [MIT licensed](LICENSE). Bundled font and dependency notices are in [NOTICE.md](NOTICE.md). Release notes are in [CHANGELOG.md](CHANGELOG.md).
