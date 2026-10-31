# Changelog

## 1.0.1 — 2026-10-31

- Select **Investigate this claim** to move straight to the research choices, including when that claim is already selected. Keyboard focus follows the action and scrolling respects reduced-motion preferences.
- Clarify in the game and [player guide](docs/PLAYING.md#follow-a-lead) that selecting a claim is free; choosing a research move spends a turn.

## 1.0.0 — 2026-10-31

- Solve ten complete fictional deduction cases with 40 claims, 100 documents, 160 research outcomes, ten image clues, and 50 prepared witness questions. [Start with the player guide](docs/PLAYING.md).
- Follow each case through the green-and-paper shelf, original illustrations, responsive investigation desk, keyboard dialogs, evidence reader, and cited verdict receipts.
- Keep independent case progress and best scores locally, with replay, reset, damaged-save recovery, and storage-denied play. See [saved progress and controls](docs/PLAYING.md#save-replay-and-controls).
- Play or publish the full game on [GitHub Pages](README.md#publish-to-github-pages) with no accounts, API keys, or runtime inference.
- Optionally add live witness questions on a server with bounded OpenRouter requests, validated replies, and prepared-play fallbacks. The adapter stays disabled by default; see the [live-witness setup and release gate](README.md#optional-live-witness-on-vercel).

### For contributors

- Check case content, rules, API boundaries, browser flows, accessibility, and synthetic performance with the [verification guide](TESTING.md); use the consolidated [specification](SPEC.md), [player instructions](docs/PLAYING.md), and [developer guide](README.md#work-on-the-game) when making changes.
