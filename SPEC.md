# Rumor Room — Build Specification

**Version:** 6.1 · October 31, 2026

**Owner:** Assaf Barnir · **Release:** 1.0.1

**Status:** implemented for release 1.0.1. Ten authored cases, static-first delivery; optional live AI stays disabled pending funded evaluation.

This is the single specification for Rumor Room. It replaces the earlier review proposals. The original document has been renamed to remove obsolete branding; the repository itself keeps its existing name. The complete case texts appear in the appendix. `content/cases.json` is their machine-readable representation.

## 1. Product and scope

A stylish, freely playable deduction game about beautiful lies. Ten complete, fictional cases span tech, nightlife, romance, wine, fashion, art, hotels, music, yachts and jewelry. Each takes approximately 4–7 minutes. The tone is glamorous, witty and adult without explicit sexual content. All characters, organizations, events and quotations are fictional. No real-person accusations.

Each case contains four claims, exactly one contradicted by the authored evidence, ten source documents, sixteen research outcomes, a prepared image clue, five prepared witness questions, and a deterministic verdict. All ten cases work without an API key, a server, or runtime inference. They are a finite library, not automatically generated on each replay. Replays change claim order, not the solution.

The homepage is a case shelf with completion progress, genre filters and an accessible how-to-play panel. All cases are unlocked from the start. A player can leave and resume any unfinished case. The game remembers each case separately and records its best score locally.

No accounts, paid tiers, multiplayer, analytics service, live web search, uploads, database, bot service, Redis, rankings or recurring generation. No claim that client-side answers or scores are tamper-proof.

## 2. Gameplay contract

1. Choose a case and read its briefing. Show **Fictional case file** throughout investigation.
2. Inspect four equally weighted claim cards. Shuffle once on a new run, preserving order on refresh. Activating **Investigate this claim** selects that card and moves focus and the viewport to the research choices, including when the card was already selected. Selection is free; only choosing a research move spends a turn. Respect reduced-motion preferences when scrolling.
3. Spend up to four research turns across the four moves below. A claim/move pair can be used once; a valid empty lookup still costs a turn. Source cards deduplicate by ID; research notes remain distinct.
4. Inspect the prepared screenshot and crop for free. Show the exact authored transcript. Pinning adds one image clue; reopening is free. The comparison note reveals the primary record only after that record has been discovered.
5. Use up to two interview turns, choosing among five prepared questions. Duplicate questions are unavailable in the same run. On a server deployment, an explicitly enabled live witness may answer a custom question instead.
6. Select the claim that does not hold up. Confirm the named choice before committing. Accusation is available even before research and at zero turns.
7. Show a cited receipt immediately, including why the target fails and support for an incorrectly selected claim. Distinguish **Your research** from **Revealed at verdict**. Show used moves, witness testimony, score and the case’s verification lesson. Offer replay and the next case.

| Move | ID | Purpose |
|---|---|---|
| Trace the leak | `trace` | Find the earliest available origin |
| Second source | `second` | Distinguish independent observations from repeated reporting |
| Official channel | `primary` | Inspect a relevant first-party record |
| Fresh cut | `fresh` | Find a later update within the case window |

At zero research turns, evidence reading, image inspection, remaining interviews and accusation still work. Reading already found evidence never costs a turn. All outcomes are authored lookups; no artificial delays or generated source selection.

Score: `correct ? 100 + 15 × unusedResearchTurns : 0`. An immediate correct guess earns 160 and must explicitly show zero research moves; this is a puzzle score, not a measure of verified work. Two moves plus a correct accusation earns 130; four earns 100. Interviews and image inspection do not change the score.

## 3. Design and accessibility

Preserve the noir newsroom: near-black green, warm paper, emerald highlights and a restrained brass accent. Serif editorial headlines, readable sans-serif body text, monospaced provenance labels. Use locally bundled fonts and original SVG/CSS illustrations. The case shelf should feel like a beautifully produced issue of a magazine; the investigation should feel like a desk of evidence. Avoid a chat-app layout.

Provide distinctive artwork for each case, tactile paper claim cards, a clear active-claim state, a research action panel, evidence drawer and image/witness tabs. Desktop and phone must both support the complete game. Phone controls wrap or stack; no horizontal scrolling or hover-only discovery. Touch targets are at least 44 pixels where practical.

Use semantic buttons, headings, form labels and landmarks, visible focus, keyboard-operable native dialogs, focus restoration, live status announcements, contrast-tested text and reduced-motion support. Modal content scrolls independently on small screens. No drag, color-only or canvas-only requirement. Illustrations are decorative; the prepared artifact has a complete text transcript and accessible labels. Keep solution information out of the visible normal UI until discovered or revealed at verdict.

## 4. Architecture and deployment

Next.js, React, TypeScript, Zod, ordinary CSS, and Node 22 or newer. All content and artwork ship with the app. Browser state uses a small pure reducer plus versioned localStorage. Storage failure permits in-memory play with an honest notice. Save each case separately; validate restored state and recompute derived discoveries and scores. Corrupt/incompatible saves recover without crashing. Render on the server without touching browser APIs; load local progress after hydration.

**Preferred publication: GitHub Pages.** Use a Next.js static export, a repository-derived base path, trailing slashes and a GitHub Actions Pages workflow. All ten cases remain complete. Navigation stays on the root page with browser history state or hashes, avoiding deep-route 404s. The static build contains no live API route and does not advertise custom AI questions. Never embed a secret for Pages.

**Optional live deployment: Vercel.** The same source also runs as a normal Next.js server build. Keep one `POST /api/ai/witness` endpoint, implemented as a Pages API route so static export can omit it. This deliberate adjustment from the former App Router endpoint keeps both deployment targets simple. No separate backend service. GitHub Pages publication does not require enabling or funding Vercel or OpenRouter.

Suggested code boundaries: `content/` for authored cases; `lib/game/` for schemas/rules/storage; `lib/server/` for provider policy; `components/` for the game; `app/` for the shell; `pages/api/ai/` for the optional witness; `public/` for prepared assets; `tests/` for behavior and security verification.

## 5. Case and state invariants

Validate ten unique cases, case/source/testimony IDs, four claims per case, ten sources, five statements, four moves per claim, referenced evidence IDs, source timestamps within the case window, exactly one contradicted claim, support for the other three, and coherent provenance groups. Original reference-case bodies and its sixteen research mappings are retained.

Store the case ID, version, random run ID, shuffled claim order, used research pairs, prepared question IDs, pinned image flag, live dispatch count, completed replies and optional accusation. Derive available turns and evidence from those actions; never trust a saved score or discovery list. Completed games reject further mutations. A replay resets that case’s run and retains its best completed score. A separate clear-progress confirmation erases local game progress only.

Live dispatch uses a separate browser counter capped at two. Save a pending marker before sending. Suppress double-clicks. Refresh/interruption must never resend; present an interrupted notice and prepared questions. Ignore responses belonging to another run. Reading stays available while waiting; other mutations are disabled until the request resolves or the player exits. Client limits are gameplay conveniences, not a per-person billing quota.

## 6. Optional OpenRouter witness

Disabled by default. `AI_ENABLED=false`, `OPENROUTER_API_KEY=` and `APP_ORIGIN=` are the only runtime settings. A Vercel deployment with all three correctly configured may expose the live option. Pages always builds it out. The key stays on the server; only the API handler sends it to the provider. No secrets, error bodies or prompts reach client bundles or logs.

Request: `{ caseId, gameId, requestId, question }`, with known case ID and UUID game/request IDs. Reject unknown fields, non-JSON requests, missing/wrong Origin, non-POST methods and bodies exceeding 4 KiB, including chunked bodies. The question must be a nonempty normalized string at most 280 Unicode characters and 1,120 UTF-8 bytes. Origin is defense in depth, not authentication.

Model: `openai/gpt-6-astra`, through `https://openrouter.ai/api/v1/chat/completions`. Fixed server-owned settings: `service_tier: default`, no streaming, `reasoning: { effort: low }`, `max_tokens: 2048` for reasoning plus visible output, provider `only: [openai]`, no fallbacks, required parameters, no data collection, maximum prompt/completion prices of $10/$50 per million and request price zero. Explicit prompt-cache mode with no breakpoints. Strict JSON schema. No model picker, tools, remote URLs, retries or repair calls.

The prompt contains only the case’s public claim texts, witness persona, five testimony statements and the current question. Never send the solution, whole evidence pack, prior conversation, private operator data or credentials. Treat the question as untrusted data. Bound fixed messages and schema to 8 KiB. Read the incoming body within 4 seconds; otherwise return 408 without inference. One dispatch, 20-second provider deadline, 25-second handler budget, 30-second function limit.

Response: `{ requestId, reply: { text, statementIds, origin: live, model } }`. Reply is at most 70 words and 600 Unicode characters. Statement IDs must be unique, at most three, and exist in the selected case. An empty list is only valid for **That isn't in my notes.** Reject HTML, Markdown links, URLs, malformed JSON, refusal, unexpected model, truncated output and incomplete finish states. Render cited prepared statements alongside live prose. Schema validation cannot prove factual faithfulness; evaluate live quality before enabling public AI.

Use `Cache-Control: no-store`. Errors return sanitized error codes: 400 invalid input, 403 Origin, 405 method, 408 incomplete request, 413 body, 429 rate limit, 502 invalid upstream output, 503 disabled/missing key/provider budget, 504 timeout. No retries on any failure. Failed calls use a live dispatch but leave interview turns available. Prepared answers are labeled **Prepared interview**, generated responses **Live AI reply**. Never fake live AI with fixtures.

## 7. Spending and abuse protection

For any future public live deployment, use a dedicated OpenRouter key with a small proposed **$5 non-renewing total limit**, separate from authoring/development. Verify the limit and `limit_reset: null` before enabling. Provider accounting can have in-flight overshoot; no promise of a perfect application-wide dollar ceiling. Do not alter unrelated account settings or enable automatic replenishment. This release does not purchase credits or configure a key.

Configure Vercel’s own WAF for the endpoint, initially 6 requests per 60 seconds per client IP. Counters may be regional. No Redis, Turnstile or identity service. Determined attackers can bypass browser quotas and exhaust the shared allowance; the budget is the financial boundary, and prepared play survives exhausted AI funding. No exactly-once promise across instances or user retries. Request IDs correlate responses only.

To stop immediately, revoke the dedicated key or block the endpoint. Environment changes may need redeployment. Vercel hosting costs are separate; spend alerts alone do not pause usage. Review plan eligibility and any team-wide production pause settings before enabling them. A static Pages release has no provider billing surface.

Show **Custom questions are sent to our AI provider. Please don't include personal information.** Progress stays in the browser; provider/hosting logs follow their own policies. Log only sanitized IDs, model, timing, usage and outcome; no raw questions or keys. Never expose production secrets to fork builds or untrusted previews.

Illustrative AI cost, two calls per game each with 2,000 input and 1,000 total billed output tokens: Astra $0.14/game; Sol $0.028/game. Reasoning is billed output. These are assumptions, not measurements; fees, taxes and hosting are separate. `openai/gpt-6.1-sol` is a deliberate lower-cost future switch with $2/$10 ceilings and repeat evaluation, never an automatic fallback. Both selected models are proprietary; the game code and authored content are MIT.

## 8. Verification and release

Meaningful unit checks cover all case invariants, all 160 research combinations, duplicate/empty lookups, scoring, wrong guesses, zero turns, completion locks, replay, save recovery, pending requests and API trust boundaries. Preserve the reference route `second(c1) → primary(c1) → image → interview → accuse c1 = 130`. Validate all ten solutions and all thirty incorrect choices.

Browser checks cover catalog navigation, every case’s complete solution route, wrong accusations, refresh/resume, independent case progress, source reading, prepared interviews, artifact comparison, keyboard dialogs, narrow screens, reduced motion and absence of horizontal overflow. Run axe on catalog, investigation and verdict. Inspect desktop and mobile screenshots. Test a static export beneath a nonempty repository base path, including asset requests and refresh.

Test the optional endpoint with fixtures only: invalid input, size limits, Origin, provider errors/refusals/truncation, injection-shaped requests, fixed model/token policy, timeout and zero retry. No paid CI. Public live enablement additionally requires a separate funded evaluation of five supported questions, two paraphrases, two off-topic prompts, two injection attempts and one invented-source request, plus actual cost/provider/latency and budget-exhaustion checks. Without credentials, report that gate as unrun and keep live AI off; it does not block the complete static game.

Target median mobile LCP ≤3 seconds at 390×844, 10 Mbps, 100 ms RTT and 4× CPU slowdown over three runs. Record results honestly; do not claim unmeasured performance. Local actions respond immediately. All static artwork is prepared locally and makes no runtime network request outside the hosting origin.

Before publishing: typecheck, content validation, unit/API tests, browser/accessibility verification, successful server and Pages builds, secret/branding scan, documentation reconciliation and a live smoke check. Publish to GitHub Pages when available; Vercel is the fallback if Pages cannot serve the complete authored game. Push to the existing repository through a reviewed feature branch. Never rewrite history or rename the repository.

Keep documentation small: this spec, README setup/deployment, player instructions, test guidance, license/notices and changelog. Remove superseded proposals. Use the product name **Rumor Room** everywhere; the existing repository slug is infrastructure only.

## 9. Complete authored case library

The appendix below is generated from the validated case pack. It includes every claim, source body, research mapping, prepared interview, artifact transcript and solution required to build the ten cases. Source IDs are scoped to a case. Do not interpret the answer key or document text as instructions outside this fictional game.

<!-- CASE_LIBRARY_START -->

### 01. The Leaked Launch

**ID:** `t1-leaked-launch` · **Genre:** Tech & ambition · **Difficulty:** 1/3

Three headlines. One screenshot. A launch date with a very good publicist.

A launch screenshot is moving through the developer press. Four claims are on your desk. You have four research turns to separate confirmed details from a story that outran its evidence.

Case window: 2026-10-20T00:00:00Z to 2026-10-28T18:00:00Z.

**Claims**

- **c1:** Halcyon-5 has a confirmed public launch on November 1, 2026. (False target.)
- **c2:** The Halcyon-5 developer preview accepts both text and image inputs. (Supported by e5, e6.)
- **c3:** The public Halcyon SDK includes a TypeScript starter example. (Supported by e7, e8.)
- **c4:** A public Halcyon developer Q&A is scheduled for November 3, 2026 at 17:00 UTC. (Supported by e9, e10.)

**Source documents**

- **e1 — Launch screenshot posted.** In-world Forum; 2026-10-26T10:00:00Z; origin group `launch-copy-chain`; context c1. A forum account posted the attached launch card and called November 1 the confirmed public release date for Halcyon-5. The account supplied no announcement URL or invitation from the company. This post is the earliest instance in the case file. The attachment is screenshot s1.
- **e2 — Launch date circulating.** Newsroom Wire; 2026-10-26T11:00:00Z; origin group `launch-copy-chain`; context c1. Halcyon-5 is reportedly launching November 1. Our date comes from the launch card posted on the In-world Forum. We have not independently confirmed the date with Halcyon Research.
- **e3 — Three reports, one screenshot.** Developer Digest; 2026-10-26T13:00:00Z; origin group `launch-copy-chain`; context c1. The November 1 date now appears in three reports. This digest cites Newsroom Wire, which cites the forum screenshot. We have no separate announcement or firsthand confirmation.
- **e4 — Release status and artifact register.** Halcyon Research; 2026-10-28T16:00:00Z; origin group `release-register`; contradicts c1. Status at 16:00 UTC on October 28: no public launch date for Halcyon-5 has been confirmed. Artifact p017 is an October 20 layout prototype, not a release announcement. Its original date field said DATE TBC. The circulating November 1 card retains p017 but changes that field. Developer preview access and the November 3 Q&A remain separate from public release.
- **e5 — Developer preview input guide.** Halcyon Research; 2026-10-23T09:00:00Z; origin group `preview-docs`; supports c2. The current Halcyon-5 developer preview accepts text prompts and still-image inputs. These capabilities are available to preview participants. Preview access is not a public product release.
- **e6 — Preview hands-on notebook.** Independent Lab Notebook; 2026-10-24T12:00:00Z; origin group `preview-observation`; supports c2. On October 24 we independently tested the preview with a text prompt and a PNG image. Both requests were accepted. This is our own observation, not a repetition of the input guide. We make no claim about the public launch date.
- **e7 — SDK v0.3 file manifest.** Halcyon SDK Repository; 2026-10-25T09:00:00Z; origin group `sdk-source`; supports c3. The public SDK v0.3 manifest includes examples/typescript/starter.ts and its setup instructions. This manifest records files actually present in that SDK version.
- **e8 — Running the TypeScript starter.** Independent Builder Notes; 2026-10-26T08:00:00Z; origin group `sdk-observation`; supports c3. We downloaded SDK v0.3 and ran examples/typescript/starter.ts. The example is present and its TypeScript setup steps work. This walkthrough is based on our own checkout.
- **e9 — Developer Q&A calendar entry.** Halcyon Events; 2026-10-27T09:00:00Z; origin group `qa-organizer`; supports c4. Public developer Q&A: November 3, 2026, 17:00 UTC. The agenda is preview feedback and SDK questions. This calendar entry does not announce a public model launch.
- **e10 — Q&A participant confirmation.** Guest Developer Journal; 2026-10-27T15:00:00Z; origin group `qa-participant`; supports c4. As an invited guest, I accepted the developer Q&A invitation for November 3 at 17:00 UTC. I will discuss the preview and SDK. This confirmation is based on my own invitation.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e1 | The earliest item here is a forum screenshot with no first-party announcement URL. |
| c1 / second | e1, e2, e3 | Three reports trace back to one screenshot. They are one origin group, not three independent confirmations. |
| c1 / primary | e4 | The official register confirms no public launch date and identifies p017 as a prototype. |
| c1 / fresh | e4 | The October 28 register is the later update: no public launch date is confirmed. |
| c2 / trace | e5 | The preview input guide documents both text and still-image input. |
| c2 / second | e5, e6 | The guide and an independent hands-on observation support the same input capabilities. |
| c2 / primary | e5 | The first-party guide supports text and image inputs for the developer preview. |
| c2 / fresh | e6 | The later hands-on notebook independently reports both input types working. |
| c3 / trace | e7 | The SDK manifest lists a TypeScript starter in version 0.3. |
| c3 / second | e7, e8 | The manifest and an independent checkout both establish that the starter exists. |
| c3 / primary | e7 | The SDK's own manifest records the TypeScript starter file. |
| c3 / fresh | e8 | A later builder walkthrough reports running the starter from a separate checkout. |
| c4 / trace | e9 | The organizer's calendar announces the Q&A, not a public model launch. |
| c4 / second | e9, e10 | The organizer's calendar and a participant's own invitation agree on the Q&A. |
| c4 / primary | e9 | The event calendar schedules November 3 at 17:00 UTC for preview feedback and SDK questions. |
| c4 / fresh | none | No matching update in this case file. |

**Witness: The Wire Editor — A deadline in a good suit.** Concise newsroom noir; slightly defensive about publishing quickly, never hostile.

- **w1 — Where did your launch-date tip come from?** My launch-date tip came from the forum card and the reports repeating it.
- **w2 — Did you confirm the release with the company?** I did not obtain a first-party public-launch announcement.
- **w3 — What inputs does the developer preview accept?** The preview documentation and a hands-on notebook describe text and image inputs.
- **w4 — Is there a TypeScript SDK example?** The SDK manifest and a builder walkthrough describe a TypeScript starter.
- **w5 — What is happening on November 3?** The calendar and a participant confirmation describe the November 3 Q&A at 17:00 UTC.

**Prepared artifact: The circulating launch card**

```text
HALCYON-5
01 NOV 2026
PUBLIC RELEASE
asset revision: p017
CASE FILE — FICTIONAL
```

Before e4 is discovered: The card says 01 NOV 2026 and carries revision p017. The image alone does not establish an official launch.

After e4: The register identifies p017 as an October 20 prototype whose date field was DATE TBC. This circulating card changes the date to November 1.

**Verdict:** c1; decisive sources e1, e4. The register confirms that no public launch date was announced. The circulating card kept the prototype revision p017 but replaced DATE TBC with November 1. All three reports lead back to that same unsupported screenshot.

**Lesson:** Three reports can still be one source. Follow the origin, then check the primary record.

### 02. The Velvet Rope

**ID:** `t2-velvet-rope` · **Genre:** Nightlife & status · **Difficulty:** 1/3

Her name was on the list. The internet thinks it knows which list.

Noor Vale arrives at Club Sable dressed like an invitation. A cropped door sheet says HOLD beside her name, and by morning it is a blacklist scandal. The door has a story. The paperwork has a better one.

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** Club Sable reached its licensed capacity before midnight. (Supported by e5, e6.)
- **c2:** Noor Vale was personally blacklisted from Club Sable that night. (False target.)
- **c3:** The rooftop set was performed by DJ Iona. (Supported by e7, e8.)
- **c4:** The midnight menu included an alcohol-free martini. (Supported by e9, e10.)

**Source documents**

- **e1 — A name on hold.** After Dark Feed; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c2. An account posted a crop reading NOOR VALE — HOLD and described it as a personal blacklist. The crop does not include the column legend or later entry status.
- **e2 — Sable snubs Noor.** Velvet Dispatch; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c2. Our report of a personal ban is based on the door-sheet crop shared by After Dark Feed. We have not spoken to the door team.
- **e3 — The blacklist everyone is talking about.** Night Window; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c2. Velvet Dispatch reports Noor was blacklisted. We are reproducing the same cropped door sheet; we have no separate record of a ban.
- **e4 — Door log and HOLD legend.** Club Sable Duty Manager; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c2. HOLD means temporary capacity queue for all unadmitted guests. At 23:56 Noor Vale joined that queue. The authenticated wristband log records her admission at 00:14. No personal exclusion was applied to her. The crop omitted the HOLD legend and admitted-at column.
- **e5 — Capacity counter.** Club Sable Operations; 2026-10-29T08:00:00Z; origin group `c1-primary`; supports c1. At 23:48 the count reached the licensed limit of 180. Admissions paused until departures freed capacity.
- **e6 — The queue at midnight.** Independent Night Reporter; 2026-10-29T09:00:00Z; origin group `c1-observation`; supports c1. I watched the door pause entry at 23:48. The public capacity display read 180 of 180; several guests, not just Noor, waited.
- **e7 — Rooftop running order.** Club Sable Music Desk; 2026-10-29T10:00:00Z; origin group `c3-primary`; supports c3. DJ Iona is contracted for the rooftop midnight set. Her soundcheck and arrival were signed off at 22:30.
- **e8 — A set above the city.** Independent Set Reviewer; 2026-10-29T11:00:00Z; origin group `c3-observation`; supports c3. I was on the rooftop and watched Iona perform the midnight set. My notes identify the performer from her live introduction.
- **e9 — Midnight drinks card.** Club Sable Bar; 2026-10-29T12:00:00Z; origin group `c4-primary`; supports c4. The menu includes Still Trouble, an alcohol-free martini made with verjus, olive brine and rosemary.
- **e10 — A very sober olive.** Independent Bar Notebook; 2026-10-29T13:00:00Z; origin group `c4-observation`; supports c4. I ordered Still Trouble from the midnight menu. The bartender confirmed the listed verjus, brine and rosemary recipe contains no alcohol.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c1 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c1 / primary | e5 | The first-party record supports this specific claim. |
| c1 / fresh | e6 | A later, independent observation supports the same detail. |
| c2 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c2 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c2 / primary | e4 | HOLD is a capacity status. The same record shows Noor being admitted at 00:14. |
| c2 / fresh | e4 | The later primary record adds the missing context. HOLD is a capacity status. The same record shows Noor being admitted at 00:14. |
| c3 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c3 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c3 / primary | e7 | The first-party record supports this specific claim. |
| c3 / fresh | e8 | A later, independent observation supports the same detail. |
| c4 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c4 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c4 / primary | e9 | The first-party record supports this specific claim. |
| c4 / fresh | e10 | A later, independent observation supports the same detail. |

**Witness: Rae Mercer — The door captain.** Dry, observant and unimpressed by followers. All people in this fiction are adults.

- **w1 — What does HOLD mean at the door?** HOLD is our temporary capacity queue. It is not the code for a personal exclusion.
- **w2 — Did anyone get in after midnight?** The wristband system records admissions after capacity frees up.
- **w3 — Who played the rooftop?** Iona was on the rooftop running order.
- **w4 — Was the club actually full?** The counter reached 180 before midnight.
- **w5 — What was the zero-proof drink?** The bar listed Still Trouble, with verjus, olive brine and rosemary.

**Prepared artifact: The cropped door sheet**

```text
CLUB SABLE / DOOR
NOOR VALE
23:56  ·  HOLD
shift: 28 OCT / line 041
CROP FROM A LARGER SHEET
```

Before e4 is discovered: HOLD sits beside a guest name. This crop does not explain the status or show later admissions.

After e4: The full log defines HOLD as the capacity queue and records Noor entering at 00:14. The missing columns change the story.

**Verdict:** c2; decisive sources e1, e4. Noor was queued, not personally blacklisted. The full door record defines HOLD as a temporary capacity status and logs her eventual admission. The three scandal reports all recycled a crop that hid those columns.

**Lesson:** A label without its legend is an invitation to invent a story.

### 03. Kiss & Tell

**ID:** `t3-kiss-and-tell` · **Genre:** Romance & reputation · **Difficulty:** 2/3

A rain-soaked kiss. Two very photogenic alibis. One inconvenient call sheet.

Mira Sen and Jules Hart share a spectacular kiss outside the Hotel Étoile. A viral still calls it an unscripted reunion. Their chemistry is real enough to distract you from the tiny production code in the corner.

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** Mira and Jules attended the same film premiere. (Supported by e5, e6.)
- **c2:** The rooftop premiere party raised funds for an arts school. (Supported by e7, e8.)
- **c3:** The photographed kiss was filmed outside the Hotel Étoile. (Supported by e9, e10.)
- **c4:** The viral kiss image captures an unscripted private moment. (False target.)

**Source documents**

- **e1 — The kiss that launched a thousand captions.** Flashbulb Feed; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c4. A still of Mira and Jules kissing in the rain is captioned a private reunion. It carries the mark E17 / TAKE 04. The uploader provides no sequence or photographer account.
- **e2 — They are back together, apparently.** The Evening Glance; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c4. We call the image an unscripted moment based on Flashbulb Feed. We did not witness the kiss.
- **e3 — A very public private moment.** Screen Door; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c4. The Evening Glance links the same E17 / TAKE 04 still. We have no additional footage or firsthand account.
- **e4 — Scene E17 call sheet and release record.** Afterglow Production Office; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c4. Scene E17 is a scripted kiss between the characters played by Mira Sen and Jules Hart. Take 04 was filmed outside the Hotel Étoile with rain equipment. The promotional still marked E17 / TAKE 04 was exported from that take. This record says nothing about the actors’ private relationship.
- **e5 — Premiere guest check-in.** Afterglow Premiere Desk; 2026-10-29T08:00:00Z; origin group `c1-primary`; supports c1. Mira Sen and Jules Hart both checked in for the October 28 Afterglow premiere.
- **e6 — Two arrivals, one premiere.** Independent Carpet Reporter; 2026-10-29T09:00:00Z; origin group `c1-observation`; supports c1. I personally photographed Mira and Jules arriving separately at the same Afterglow premiere.
- **e7 — Benefit accounting note.** Étoile Event Office; 2026-10-29T10:00:00Z; origin group `c2-primary`; supports c2. The rooftop premiere party raised $12,000, transferred to the Eastbank Arts School scholarship fund.
- **e8 — Scholarship receipt.** Eastbank Arts School; 2026-10-29T11:00:00Z; origin group `c2-observation`; supports c2. Our bank confirmation records the $12,000 premiere-party donation. We received it for student scholarships.
- **e9 — Location permit E17.** Étoile Location Office; 2026-10-29T12:00:00Z; origin group `c3-primary`; supports c3. Production was permitted to film scene E17 on the exterior pavement of Hotel Étoile. No interior room was part of the scene.
- **e10 — Rain on a clear night.** Independent Location Observer; 2026-10-29T13:00:00Z; origin group `c3-observation`; supports c3. From across the street I watched the film crew, rain rig and actors working outside Hotel Étoile. I did not see a private encounter.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c1 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c1 / primary | e5 | The first-party record supports this specific claim. |
| c1 / fresh | e6 | A later, independent observation supports the same detail. |
| c2 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c2 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c2 / primary | e7 | The first-party record supports this specific claim. |
| c2 / fresh | e8 | A later, independent observation supports the same detail. |
| c3 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c3 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c3 / primary | e9 | The first-party record supports this specific claim. |
| c3 / fresh | e10 | A later, independent observation supports the same detail. |
| c4 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c4 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c4 / primary | e4 | E17 / TAKE 04 identifies a scripted scene. It establishes no private relationship. |
| c4 / fresh | e4 | The later primary record adds the missing context. E17 / TAKE 04 identifies a scripted scene. It establishes no private relationship. |

**Witness: Sol Vega — The stills editor.** Wry, precise and fond of a beautiful composition; never guesses about private relationships.

- **w1 — What is E17 / TAKE 04?** It is the scene and take identifier attached to the production still.
- **w2 — Did you witness a private reunion?** I worked with production images. I have no private-relationship information.
- **w3 — Where was the image filmed?** The location record names the exterior of Hotel Étoile.
- **w4 — Were both actors at the premiere?** The premiere check-in records both Mira and Jules.
- **w5 — Who received the benefit money?** The event record and school receipt name Eastbank Arts School.

**Prepared artifact: The still everyone shared**

```text
ÉTOILE / NIGHT EXTERIOR
ONE MORE KISS
MIRA + JULES
E17 / TAKE 04
PROMOTIONAL CONTACT SHEET
```

Before e4 is discovered: The image includes a scene-and-take style code. A still alone cannot establish the circumstances of a kiss.

After e4: The call sheet matches E17 / TAKE 04 to a scripted scene. The photo is authentic; its private-moment caption is not.

**Verdict:** c4; decisive sources e1, e4. The picture is a production still from a scripted kiss, identified by the exact E17 / TAKE 04 code. A real image can carry a false caption. The records do not establish whether the actors are dating, and the verdict makes no claim about that.

**Lesson:** An authentic image does not make its caption authentic.

### 04. The Ninth Pour

**ID:** `t4-ninth-pour` · **Genre:** Wine & temptation · **Difficulty:** 2/3

The vintage is legendary. The label is gorgeous. The tasting card is doing a lot of work.

At an invitation-only cellar dinner, glass nine becomes the most photographed drink in town. A small tag is being treated as proof that guests tasted a rare 1988 reserve. Read the label like the sommelier reads the ledger.

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** The wine served as pour nine was the estate’s 1988 reserve. (False target.)
- **c2:** The dinner offered nine tasting pours. (Supported by e5, e6.)
- **c3:** The estate’s reserve bottle remained sealed in its vault. (Supported by e7, e8.)
- **c4:** Chef Ana Lune served a mushroom course with pour nine. (Supported by e9, e10.)

**Source documents**

- **e1 — A sip of 1988.** Cellar Social; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c1. A guest posted the tag FLIGHT V88 / POUR 09 and called the glass a 1988 reserve. No bottle label or decanting record appears in the post.
- **e2 — The rare reserve comes out.** Fine Print Wine; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c1. Our claim that the dinner poured the 1988 reserve comes from Cellar Social’s tag photograph.
- **e3 — Nine pours and a legend.** The Dinner Note; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c1. Fine Print Wine reports a 1988 pour. We have the same FLIGHT V88 image, not an independent bottle inspection.
- **e4 — Decanting ledger: flight V88.** Garnet Cellar Sommelier; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c1. V88 is the dinner’s flight identifier, not a vintage. Pour 09 was decanted from the 2022 estate red, bottle serial R22-091. The 1988 reserve, serial R88-001, was not opened or poured.
- **e5 — Nine-course wine sequence.** Garnet Cellar Events; 2026-10-29T08:00:00Z; origin group `c2-primary`; supports c2. The tasting menu lists nine wine pours, numbered 01 through 09. No tenth pour is scheduled.
- **e6 — Counting the glasses.** Independent Dining Notebook; 2026-10-29T09:00:00Z; origin group `c2-observation`; supports c2. I attended the dinner and recorded nine numbered pours at my place setting.
- **e7 — Vault seal register.** Garnet Cellar Custodian; 2026-10-29T10:00:00Z; origin group `c3-primary`; supports c3. Reserve serial R88-001 has an intact seal at the checks immediately before and after dinner. It remained in the locked vault.
- **e8 — Seal check witness.** Independent Inventory Auditor; 2026-10-29T11:00:00Z; origin group `c3-observation`; supports c3. I witnessed both seal checks on R88-001 and countersigned the register. The same sealed bottle was present after service.
- **e9 — Kitchen service sheet.** Ana Lune’s Kitchen; 2026-10-29T12:00:00Z; origin group `c4-primary`; supports c4. Chef Ana Lune’s final savory course is roasted mushroom with black garlic. It is paired with pour 09.
- **e10 — The last savory plate.** Independent Dining Critic; 2026-10-29T13:00:00Z; origin group `c4-observation`; supports c4. Ana Lune introduced the mushroom course at the table. It arrived with the glass marked 09.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c1 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c1 / primary | e4 | V88 labels the flight. The ledger records a 2022 wine for pour nine. |
| c1 / fresh | e4 | The later primary record adds the missing context. V88 labels the flight. The ledger records a 2022 wine for pour nine. |
| c2 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c2 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c2 / primary | e5 | The first-party record supports this specific claim. |
| c2 / fresh | e6 | A later, independent observation supports the same detail. |
| c3 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c3 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c3 / primary | e7 | The first-party record supports this specific claim. |
| c3 / fresh | e8 | A later, independent observation supports the same detail. |
| c4 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c4 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c4 / primary | e9 | The first-party record supports this specific claim. |
| c4 / fresh | e10 | A later, independent observation supports the same detail. |

**Witness: Béa March — The sommelier.** Sensuous about wine, exact about inventory. She never treats price as proof of taste.

- **w1 — Does V88 mean a 1988 vintage?** V88 is the identifier of the tasting flight.
- **w2 — Which bottle supplied pour nine?** The decanting ledger names bottle R22-091.
- **w3 — How many pours were served?** The service sequence runs from 01 through 09.
- **w4 — Was the reserve opened?** The vault checks record R88-001 with its seal intact.
- **w5 — What was the last savory course?** Ana Lune’s mushroom and black garlic course accompanied pour 09.

**Prepared artifact: A very suggestive tasting tag**

```text
THE GARNET CELLAR
FLIGHT V88
POUR 09
table nine / private tasting
PLEASE KEEP YOUR TASTING CARD
```

Before e4 is discovered: V88 appears next to FLIGHT. The card does not explicitly state a vintage.

After e4: The ledger defines V88 as a flight code and names the 2022 bottle actually poured. The reserve’s 1988 vintage belongs to a different bottle.

**Verdict:** c1; decisive sources e1, e4. The viral interpretation turned a flight code into a vintage. The decanting ledger identifies pour nine as the 2022 estate red. The 1988 reserve stayed sealed; the independent vault check confirms that separate fact.

**Lesson:** An identifier is not a description. Find out what a code actually encodes.

### 05. Silk After Midnight

**ID:** `t5-silk-after-midnight` · **Genre:** Fashion & rivalry · **Difficulty:** 2/3

One spiral-cut dress. Two designers. A feud tailored to fit a cropped date.

Aster Vale’s spiral dress turns a runway into a slow-motion argument. Vela’s fans say their designer got there first. A lookbook crop has the day and month. The year is hiding just outside the frame.

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** Aster’s spiral dress used reclaimed silk. (Supported by e5, e6.)
- **c2:** Aster’s runway show had a live string quartet. (Supported by e7, e8.)
- **c3:** Vela’s public spiral-dress debut preceded Aster’s first public version. (False target.)
- **c4:** Both designers credited the same independent pleating workshop. (Supported by e9, e10.)

**Source documents**

- **e1 — Who wore the idea first?.** Front Row Feed; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c3. A crop of Aster’s lookbook says 14 JUL / LOOK 07, with the year missing. The caption assumes July 2026 and says Vela’s September 2025 debut came first.
- **e2 — The spiral dispute.** Hemline Dispatch; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c3. We repeat Front Row Feed’s chronology from the same yearless lookbook crop. We have not inspected the archive.
- **e3 — Fashion’s most circular argument.** Bias Cut; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c3. Hemline Dispatch places Vela first. Our evidence is the same 14 JUL image, not a separately dated publication.
- **e4 — Lookbook archive and publication history.** Meridian Fashion Archive; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c3. The complete Aster lookbook was publicly deposited on July 14, 2025; Look 07 is the spiral-cut dress. Vela’s first public spiral-dress presentation was September 2, 2025. The viral crop removes the year 2025 from Aster’s page. The archive establishes chronology, not anyone’s private creative process.
- **e5 — Fabric allocation for Look 07.** Aster Atelier; 2026-10-29T08:00:00Z; origin group `c1-primary`; supports c1. Look 07 uses reclaimed silk from stock lot RS-41. The cutting sheet records no newly woven silk for this garment.
- **e6 — Inside the sample room.** Independent Textile Reviewer; 2026-10-29T09:00:00Z; origin group `c1-observation`; supports c1. I inspected the RS-41 material and watched its use in Look 07 during my atelier visit. The reclaimed-stock tags matched the cutting sheet.
- **e7 — Show music contract.** Aster Show Office; 2026-10-29T10:00:00Z; origin group `c2-primary`; supports c2. A live four-person string quartet was booked for the runway. The contract lists two violins, viola and cello.
- **e8 — Four players beside the runway.** Independent Runway Reporter; 2026-10-29T11:00:00Z; origin group `c2-observation`; supports c2. I watched four string players perform beside Aster’s runway: two violinists, a violist and a cellist.
- **e9 — Workshop credits.** Fold / Independent Pleating; 2026-10-29T12:00:00Z; origin group `c4-primary`; supports c4. Both Aster and Vela contracted Fold for pleating and credited the workshop in their public show notes.
- **e10 — Credit lines compared.** Independent Fashion Librarian; 2026-10-29T13:00:00Z; origin group `c4-observation`; supports c4. I checked the two original show-note booklets. Each includes an explicit credit to Fold for pleating.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c1 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c1 / primary | e5 | The first-party record supports this specific claim. |
| c1 / fresh | e6 | A later, independent observation supports the same detail. |
| c2 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c2 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c2 / primary | e7 | The first-party record supports this specific claim. |
| c2 / fresh | e8 | A later, independent observation supports the same detail. |
| c3 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c3 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c3 / primary | e4 | Aster’s July 2025 public version preceded Vela’s September 2025 debut. |
| c3 / fresh | e4 | The later primary record adds the missing context. Aster’s July 2025 public version preceded Vela’s September 2025 debut. |
| c4 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c4 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c4 / primary | e9 | The first-party record supports this specific claim. |
| c4 / fresh | e10 | A later, independent observation supports the same detail. |

**Witness: Indra Moss — The fashion archivist.** Cool, elegant and allergic to chronological shortcuts. Does not infer plagiarism from similarity.

- **w1 — What is missing from the crop?** The full lookbook page includes a year that the crop leaves out.
- **w2 — Does chronology prove copying?** Publication dates establish order. They do not establish a designer’s private creative process.
- **w3 — What was the dress made from?** The cutting sheet identifies reclaimed silk lot RS-41.
- **w4 — Was the music live?** The show contract and a reporter describe a live string quartet.
- **w5 — Why does Fold appear in both credits?** Both designers used and credited the same independent pleating workshop.

**Prepared artifact: The yearless lookbook crop**

```text
ASTER / LOOKBOOK
14 JUL
LOOK 07 / SPIRAL
archival page 07 · lower edge cropped
PUBLIC COLLECTION CONTACT SHEET
```

Before e4 is discovered: The crop gives a day and month but no year. You cannot order two debuts from that alone.

After e4: The uncropped archive dates this page to July 2025. Vela’s September 2025 debut came later.

**Verdict:** c3; decisive sources e1, e4. The missing year reverses the apparent timeline. Aster’s public lookbook is dated July 14, 2025, before Vela’s September 2, 2025 debut. This disproves the stated order; it does not establish that either designer copied the other.

**Lesson:** A cropped date can reverse a timeline. Verify the full timestamp before the feud.

### 06. The Last Bid

**ID:** `t6-last-bid` · **Genre:** Art & money · **Difficulty:** 3/3

Champagne, applause, and a quarter-million-dollar misunderstanding.

At the Halation benefit auction, a mirrored sculpture sells for $240,000. The headline says every dollar went to charity. The room loves a generous ending. The settlement sheet insists on doing the math.

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** Lot 08 sold for a $240,000 hammer price. (Supported by e5, e6.)
- **c2:** The entire $240,000 hammer price was transferred to charity. (False target.)
- **c3:** Four registered bidders competed for Lot 08. (Supported by e7, e8.)
- **c4:** The sculpture was made from reclaimed mirror glass. (Supported by e9, e10.)

**Source documents**

- **e1 — A quarter million for the cause.** Gala Feed; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c2. A photograph of the SOLD / $240,000 screen is captioned “every dollar to charity.” It does not show the auction’s donation terms.
- **e2 — A glittering gift.** Society Ledger; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c2. Our report of a full $240,000 charity transfer repeats Gala Feed’s auction-screen image. We have not seen settlement paperwork.
- **e3 — Art gives it all away.** Canvas Daily; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c2. Society Ledger reports the entire hammer price was donated. Our item cites its report and the same sale screen.
- **e4 — Lot 08 settlement and beneficiary receipt.** Halation Settlement Office; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c2. Lot 08’s hammer price was $240,000. The published terms allocate 25% of the hammer to the Bright Steps charity and 75% to the consignor. The charity receipt confirms $60,000 received. The remaining $180,000 was paid to the consignor. No buyer premium is included in these amounts.
- **e5 — Hammer record: Lot 08.** Halation Auctioneer; 2026-10-29T08:00:00Z; origin group `c1-primary`; supports c1. Lot 08 closed at a hammer price of $240,000. This figure excludes buyer premiums and does not state the donation allocation.
- **e6 — The final paddle.** Independent Auction Reporter; 2026-10-29T09:00:00Z; origin group `c1-observation`; supports c1. I attended the sale and recorded the auctioneer’s final hammer call of $240,000 for Lot 08.
- **e7 — Bidder register: Lot 08.** Halation Registrar; 2026-10-29T10:00:00Z; origin group `c3-primary`; supports c3. Four distinct registered bidder IDs placed accepted bids for Lot 08.
- **e8 — Four paddles in the room.** Independent Auction Observer; 2026-10-29T11:00:00Z; origin group `c3-observation`; supports c3. I tracked four distinct paddles competing for Lot 08. My observation concerns bidders, not the number of individual bids.
- **e9 — Material certificate.** Artist’s Studio; 2026-10-29T12:00:00Z; origin group `c4-primary`; supports c4. The sculpture’s mirrored surfaces are made from reclaimed mirror glass. The steel support is separately listed.
- **e10 — Studio visit notes.** Independent Art Conservator; 2026-10-29T13:00:00Z; origin group `c4-observation`; supports c4. During a studio visit I inspected the reclaimed mirror stock and the completed mirrored surfaces. My observation agrees with the material certificate.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c1 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c1 / primary | e5 | The first-party record supports this specific claim. |
| c1 / fresh | e6 | A later, independent observation supports the same detail. |
| c2 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c2 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c2 / primary | e4 | The charity received 25%: $60,000. A sale price is not the same as a donation. |
| c2 / fresh | e4 | The later primary record adds the missing context. The charity received 25%: $60,000. A sale price is not the same as a donation. |
| c3 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c3 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c3 / primary | e7 | The first-party record supports this specific claim. |
| c3 / fresh | e8 | A later, independent observation supports the same detail. |
| c4 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c4 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c4 / primary | e9 | The first-party record supports this specific claim. |
| c4 / fresh | e10 | A later, independent observation supports the same detail. |

**Witness: Maxine Price — The settlement clerk.** Impeccable suit, dangerous arithmetic, no patience for charitable rounding.

- **w1 — Does the sale screen show the charity’s share?** The screen shows a hammer price. Donation allocation is in the published terms.
- **w2 — What percentage was pledged?** The terms allocate 25% of the hammer to Bright Steps.
- **w3 — How many bidders competed?** The register shows four distinct bidder IDs for Lot 08.
- **w4 — What material was reclaimed?** The certificate identifies the mirror glass as reclaimed.
- **w5 — Are buyer premiums part of these figures?** The hammer and allocation figures quoted in the settlement exclude buyer premiums.

**Prepared artifact: The sale screen**

```text
HALATION / LOT 08
$240,000
SOLD AT HAMMER
benefit auction · terms apply
HAMMER PRICE EXCLUDES BUYER PREMIUM
```

Before e4 is discovered: This screen states a sale price, not a charity transfer. The phrase terms apply matters.

After e4: The settlement allocates 25% to charity: $60,000. The other $180,000 goes to the consignor.

**Verdict:** c2; decisive sources e1, e4. The headline confused the gross hammer price with the charity’s share. The disclosed allocation is 25%, and the beneficiary receipt confirms $60,000. The $240,000 sale itself is real; the claimed full donation is not.

**Lesson:** Always ask: a percentage of what, and paid to whom?

### 07. Room 308

**ID:** `t7-room-308` · **Genre:** Hotels & alibis · **Difficulty:** 3/3

A midnight timestamp. An immaculate alibi. A city four hours behind the story.

A key-card log from the Saffron Hotel has turned Dorian’s afterparty arrival into a midnight scandal. The screenshot is precise to the second. Precision is not the same thing as the right time zone.

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** Dorian was a registered guest at the Saffron Hotel. (Supported by e5, e6.)
- **c2:** Room 308 hosted an invitation-only afterparty. (Supported by e7, e8.)
- **c3:** The hotel’s rooftop kitchen closed at 23:00 local time. (Supported by e9, e10.)
- **c4:** The recorded first use of Dorian’s room-308 key occurred after local midnight. (False target.)

**Source documents**

- **e1 — The midnight key.** Late Checkout Feed; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c4. A screenshot reads 2026-10-29 00:12:04Z / ROOM 308. The caption calls this Dorian’s first entry after local midnight. It does not convert the time zone.
- **e2 — An arrival after hours.** The Lobby Letter; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c4. We repeat Late Checkout Feed’s reading of the key-card screenshot. We did not obtain a local-time access log.
- **e3 — The room everyone is whispering about.** Suite Talk; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c4. The Lobby Letter reports a post-midnight arrival, based on the same UTC-marked screenshot.
- **e4 — Access-clock configuration and converted entry.** Saffron Hotel Security; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c4. The access system stores timestamps in UTC, indicated by Z. Port Meridian was UTC−04:00 on this date. Dorian’s first key use at 2026-10-29 00:12:04Z therefore occurred at 20:12:04 local time on October 28, before local midnight. This entry does not identify any other person present.
- **e5 — Guest-registration confirmation.** Saffron Front Desk; 2026-10-29T08:00:00Z; origin group `c1-primary`; supports c1. Dorian is listed as a registered adult guest for October 28. The record confirms registration only.
- **e6 — Checking in at Saffron.** Independent Event Host; 2026-10-29T09:00:00Z; origin group `c1-observation`; supports c1. I accompanied Dorian to the Saffron front desk and watched the registration and key issue. I did not enter a guest room.
- **e7 — Room 308 event booking.** Saffron Events; 2026-10-29T10:00:00Z; origin group `c2-primary`; supports c2. Room 308 is the hotel’s private event salon. It was booked for an invitation-only afterparty on October 28.
- **e8 — An invitation to 308.** Independent Invited Guest; 2026-10-29T11:00:00Z; origin group `c2-observation`; supports c2. My invitation identified room 308 as the private event salon. I attended its invitation-only afterparty.
- **e9 — Rooftop kitchen closing sheet.** Saffron Kitchen; 2026-10-29T12:00:00Z; origin group `c3-primary`; supports c3. Hot-food service on the rooftop ended at 23:00 local time on October 28. Bar service had a separate schedule.
- **e10 — The last kitchen order.** Independent Dining Reporter; 2026-10-29T13:00:00Z; origin group `c3-observation`; supports c3. I was on the rooftop when kitchen staff announced the 23:00 local close. Drinks remained available afterward.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c1 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c1 / primary | e5 | The first-party record supports this specific claim. |
| c1 / fresh | e6 | A later, independent observation supports the same detail. |
| c2 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c2 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c2 / primary | e7 | The first-party record supports this specific claim. |
| c2 / fresh | e8 | A later, independent observation supports the same detail. |
| c3 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c3 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c3 / primary | e9 | The first-party record supports this specific claim. |
| c3 / fresh | e10 | A later, independent observation supports the same detail. |
| c4 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c4 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c4 / primary | e4 | 00:12 UTC converts to 20:12 on the previous local date. This was an evening entry. |
| c4 / fresh | e4 | The later primary record adds the missing context. 00:12 UTC converts to 20:12 on the previous local date. This was an evening entry. |

**Witness: Nico Bell — The night concierge.** Velvet voice, steel memory. Never speculates about a guest’s private company.

- **w1 — What does the Z in the timestamp mean?** The access-system timestamps are stored in UTC; Z marks that time basis.
- **w2 — What was the local offset?** Port Meridian was four hours behind UTC on the event date.
- **w3 — Is room 308 a bedroom?** The event booking identifies room 308 as a private event salon.
- **w4 — Was Dorian registered?** The front desk record confirms Dorian’s guest registration.
- **w5 — When did the rooftop kitchen close?** The kitchen sheet records a 23:00 local close, separate from bar service.

**Prepared artifact: The key-card log**

```text
SAFFRON / ACCESS AUDIT
00:12:04Z
2026-10-29 / ROOM 308
keyholder: DORIAN / first accepted use
SYSTEM EXPORT · ORIGINAL TIME BASIS
```

Before e4 is discovered: The timestamp ends in Z. Establish the system’s time basis before calling this a local-midnight arrival.

After e4: UTC−04:00 puts this event at 20:12:04 on October 28 locally. The date changes as well as the hour.

**Verdict:** c4; decisive sources e1, e4. The screenshot was read in the wrong time zone. The system’s UTC timestamp converts to 20:12:04 on October 28 in Port Meridian, before local midnight. The entry reveals nothing about who else was present, and room 308 is an event salon.

**Lesson:** Precise timestamps still need a time zone. Convert both the hour and the date.

### 08. The Ghost Track

**ID:** `t8-ghost-track` · **Genre:** Music & fame · **Difficulty:** 3/3

Two identical waveforms. A lip-sync accusation. One file wearing two names.

Lina Lux’s velvet encore is accused of being too perfect. Two clips labeled NIGHT 1 and NIGHT 2 have identical waveforms. Before you judge the voice, investigate whether you are even hearing two performances.

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** The two matching viral clips are recordings from two different nights. (False target.)
- **c2:** Lina performed an encore titled Slow Fever. (Supported by e5, e6.)
- **c3:** The residency used a live three-piece band. (Supported by e7, e8.)
- **c4:** Night two included a spoken dedication to the stage crew. (Supported by e9, e10.)

**Source documents**

- **e1 — A voice that never changes.** Waveform Watch; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c1. Two files labeled NIGHT 1 and NIGHT 2 have matching waveforms. The uploader calls them separate performance recordings but supplies no original recording metadata.
- **e2 — Too perfect twice.** Backstage Dispatch; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c1. Our two-night comparison comes from Waveform Watch’s paired files. We have not acquired the original session recordings.
- **e3 — The ghost in the encore.** Needle Notes; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c1. Backstage Dispatch reports identical performances on two nights. We used the same paired clips rather than making our own recordings.
- **e4 — Clip export audit.** Orchid Audio Archive; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c1. Both viral files were exported from the same night-one source segment, session O1, from 01:02:10 to 01:02:34. Their source hashes match because the exporter duplicated that segment under two filenames. Night two is session O2, with different audio and duration. This audit establishes a file mix-up; it does not adjudicate every aspect of a live performance.
- **e5 — Encore set list.** Lina Lux Tour Desk; 2026-10-29T08:00:00Z; origin group `c2-primary`; supports c2. The encore for both residency nights is titled Slow Fever.
- **e6 — The song at the end.** Independent Music Reviewer; 2026-10-29T09:00:00Z; origin group `c2-observation`; supports c2. I attended the first night and heard Lina introduce the encore as Slow Fever.
- **e7 — Residency stage plot.** Orchid Production; 2026-10-29T10:00:00Z; origin group `c3-primary`; supports c3. The live band has three players: keys, bass and drums. The stage plot includes live inputs for each.
- **e8 — Three players, one pocket.** Independent Stage Photographer; 2026-10-29T11:00:00Z; origin group `c3-observation`; supports c3. From the photo pit I watched three musicians play keys, bass and drums throughout the set.
- **e9 — Night-two cue record.** Orchid Stage Manager; 2026-10-29T12:00:00Z; origin group `c4-primary`; supports c4. Before the night-two encore, Lina delivered a spoken dedication thanking the stage crew.
- **e10 — A thank-you from the stage.** Independent Night-Two Attendee; 2026-10-29T13:00:00Z; origin group `c4-observation`; supports c4. I attended night two and recorded Lina’s spoken thanks to the stage crew before the encore.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c1 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c1 / primary | e4 | The two files repeat one night-one segment. Different filenames do not establish different recordings. |
| c1 / fresh | e4 | The later primary record adds the missing context. The two files repeat one night-one segment. Different filenames do not establish different recordings. |
| c2 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c2 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c2 / primary | e5 | The first-party record supports this specific claim. |
| c2 / fresh | e6 | A later, independent observation supports the same detail. |
| c3 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c3 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c3 / primary | e7 | The first-party record supports this specific claim. |
| c3 / fresh | e8 | A later, independent observation supports the same detail. |
| c4 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c4 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c4 / primary | e9 | The first-party record supports this specific claim. |
| c4 / fresh | e10 | A later, independent observation supports the same detail. |

**Witness: Juno Reed — The audio archivist.** Warm, sardonic, meticulous about files. Never infers a singer’s method from filenames.

- **w1 — Where did the paired clips originate?** The archive audit traces both viral clips to session O1.
- **w2 — Do filenames prove separate recordings?** A filename can be changed without changing the recording inside it.
- **w3 — What was the encore called?** The tour set list names Slow Fever.
- **w4 — How many live musicians were there?** The stage plot and a photographer describe keys, bass and drums.
- **w5 — Who got the night-two dedication?** The stage cue record and an attendee describe a thank-you to the stage crew.

**Prepared artifact: The viral waveform comparison**

```text
WAVEFORM WATCH
NIGHT 1 = NIGHT 2?
slow-fever-1.wav / slow-fever-2.wav
shared source segment: O1 / 01:02:10
FILENAMES SUPPLIED BY UPLOADER
```

Before e4 is discovered: The filenames imply two nights, but the visible source-segment mark says O1. Check the originals.

After e4: The archive traces both exports to the same O1 segment. The matching waveforms measure a duplicate, not two performances.

**Verdict:** c1; decisive sources e1, e4. Both clips are exports of the same night-one segment. A renamed duplicate naturally produces a matching waveform. The audit disproves the claim that these files document two nights; it does not prove or disprove every broader lip-sync allegation.

**Lesson:** Before comparing two pieces of evidence, check whether they are actually two pieces.

### 09. The Vanishing Yacht

**ID:** `t9-vanishing-yacht` · **Genre:** Escape & privilege · **Difficulty:** 3/3

A yacht, a signal gap, and a straight line through forbidden water.

The private yacht Paloma disappears from the public tracker for twenty minutes. A perfectly straight line crosses a protected lagoon. Everyone has an opinion about its passengers. Your job is to establish where the boat actually went.

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** Paloma left the marina at 21:50 local time. (Supported by e5, e6.)
- **c2:** The public tracker lost live positions for twenty minutes. (Supported by e7, e8.)
- **c3:** Paloma entered the protected lagoon during the signal gap. (False target.)
- **c4:** A licensed pilot was aboard for the departure. (Supported by e9, e10.)

**Source documents**

- **e1 — The shortcut they did not want you to see.** Coastline Feed; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c3. A screenshot joins two public tracking points with a straight line crossing the protected lagoon. The caption treats the line as the yacht’s observed route.
- **e2 — A yacht above the rules.** Harbor Dispatch; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c3. Our lagoon-entry report is based on Coastline Feed’s straight-line map. We have no onboard fixes for the gap.
- **e3 — Twenty minutes of privilege.** The Wake; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c3. Harbor Dispatch reports the crossing from the same interpolated tracker image. We did not obtain a separate navigation record.
- **e4 — Onboard track and public-display audit.** Azure Harbor Navigation Office; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c3. The public tracker drew a straight interpolated connector between its 21:50 and 22:10 fixes. It had no live positions between them. The onboard logger, independently downloaded at berth, records a curved route around the lagoon’s outer buoys, outside the protected boundary throughout. The public connector was labeled ESTIMATED, a legend cropped out of the shared image.
- **e5 — Marina departure log.** Azure Marina Control; 2026-10-29T08:00:00Z; origin group `c1-primary`; supports c1. Paloma cleared its assigned berth at 21:50 local time.
- **e6 — Watching the departure.** Independent Harbor Reporter; 2026-10-29T09:00:00Z; origin group `c1-observation`; supports c1. I watched Paloma leave its berth and noted the marina clock reading 21:50.
- **e7 — Public tracker outage record.** Coastal Tracking Service; 2026-10-29T10:00:00Z; origin group `c2-primary`; supports c2. No live Paloma positions were received between the 21:50 and 22:10 updates. The display connected the two fixes by interpolation.
- **e8 — A gap on my screen.** Independent Coastal Observer; 2026-10-29T11:00:00Z; origin group `c2-observation`; supports c2. I saved the live public display as it stopped updating after 21:50 and resumed at 22:10. I saw no intermediate position reports.
- **e9 — Pilot assignment.** Azure Pilotage Office; 2026-10-29T12:00:00Z; origin group `c4-primary`; supports c4. Licensed pilot Lena Orr signed onto Paloma for its departure from Azure Marina.
- **e10 — Pilot boarding observation.** Independent Quay Photographer; 2026-10-29T13:00:00Z; origin group `c4-observation`; supports c4. I photographed Lena Orr boarding Paloma in pilot uniform and speaking with marina control before departure.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c1 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c1 / primary | e5 | The first-party record supports this specific claim. |
| c1 / fresh | e6 | A later, independent observation supports the same detail. |
| c2 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c2 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c2 / primary | e7 | The first-party record supports this specific claim. |
| c2 / fresh | e8 | A later, independent observation supports the same detail. |
| c3 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c3 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c3 / primary | e4 | The line is an estimate. The recovered onboard track stays outside the lagoon. |
| c3 / fresh | e4 | The later primary record adds the missing context. The line is an estimate. The recovered onboard track stays outside the lagoon. |
| c4 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c4 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c4 / primary | e9 | The first-party record supports this specific claim. |
| c4 / fresh | e10 | A later, independent observation supports the same detail. |

**Witness: Lena Orr — The harbor pilot.** Unhurried, salty and precise. Passenger gossip is outside her job.

- **w1 — Does a line on the public map mean a measured route?** The tracker can connect missing fixes with an estimated line.
- **w2 — Was there another navigation record?** The harbor office downloaded the onboard logger at berth.
- **w3 — When did Paloma leave?** The marina departure log records 21:50 local time.
- **w4 — How long was the public signal gap?** The public feed has a twenty-minute gap between 21:50 and 22:10.
- **w5 — Were you aboard as a licensed pilot?** The pilotage assignment records me aboard for departure.

**Prepared artifact: The public tracker crop**

```text
PALOMA / PUBLIC TRACK
21:50 — 22:10
TWO FIXES / ONE CONNECTOR
display segment: interpolated
MAP LEGEND OUTSIDE SHARED CROP
```

Before e4 is discovered: This display shows two fixes joined by a line. It does not show measured positions between them.

After e4: The missing legend labels the line as estimated. The onboard log curves around the protected boundary.

**Verdict:** c3; decisive sources e1, e4. The public map filled a twenty-minute signal gap with a straight line. That connector was not a measured route. The independently recovered onboard track follows the outer buoys and stays outside the protected lagoon.

**Lesson:** A smooth visualization can hide missing data. Separate observation from interpolation.

### 10. Diamonds on Ice

**ID:** `t10-diamonds-on-ice` · **Genre:** Jewels & illusion · **Difficulty:** 2/3

Eight million dollars in a melting ice sculpture. Allegedly.

At the Frost & Flame gala, a necklace glitters inside a tower of ice. The press card quotes an eight-million-dollar valuation. What is being valued, what is being displayed, and why does the tray say P-04?

Case window: 2026-10-20T00:00:00Z to 2026-10-30T23:59:00Z.

**Claims**

- **c1:** The original necklace J-01 was valued at $8 million. (Supported by e5, e6.)
- **c2:** The necklace inside the midnight ice sculpture was the original $8 million piece. (False target.)
- **c3:** The ice sculpture was made by artist Esme Frost. (Supported by e7, e8.)
- **c4:** The display piece was returned to the prop team after the reveal. (Supported by e9, e10.)

**Source documents**

- **e1 — Eight million on ice.** Gala Lens; 2026-10-29T01:00:00Z; origin group `shared-artifact`; context c2. A photo pairs the ice-display necklace with an $8,000,000 press card. The caption identifies the displayed object as the original. Its tray code P-04 is visible.
- **e2 — A very expensive melt.** Jewel Dispatch; 2026-10-29T02:00:00Z; origin group `shared-artifact`; context c2. We identify the ice necklace as the original based on Gala Lens’s paired image, not a gem inspection.
- **e3 — Cold cash, colder diamonds.** The Facet; 2026-10-29T03:00:00Z; origin group `shared-artifact`; context c2. Jewel Dispatch reports that the original was frozen for the reveal. Our image is the same P-04 tray photograph.
- **e4 — Display inventory and original custody record.** Frost & Flame Registrar; 2026-10-30T16:00:00Z; origin group `primary-record`; contradicts c2. Display code P-04 identifies a plated-brass and glass replica made for the ice reveal. The original necklace, inventory J-01, remained in secured custody off site. The press card’s $8,000,000 valuation refers to J-01, not P-04.
- **e5 — Valuation certificate J-01.** Independent Gem Valuer; 2026-10-29T08:00:00Z; origin group `c1-primary`; supports c1. The original necklace J-01 has an assessed value of $8,000,000. This certificate does not apply to replicas or promotional objects.
- **e6 — The original at appraisal.** Independent Jewelry Reporter; 2026-10-29T09:00:00Z; origin group `c1-observation`; supports c1. I attended the J-01 appraisal presentation and inspected the valuation certificate. The object was identified as the original, not the ice-display prop.
- **e7 — Ice installation commission.** Frost & Flame Production; 2026-10-29T10:00:00Z; origin group `c3-primary`; supports c3. Artist Esme Frost was commissioned to create the midnight ice sculpture and supervised installation.
- **e8 — Building the frozen stage.** Independent Art Photographer; 2026-10-29T11:00:00Z; origin group `c3-observation`; supports c3. I photographed Esme Frost carving and installing the gala’s ice sculpture.
- **e9 — P-04 return receipt.** Frost & Flame Prop Team; 2026-10-29T12:00:00Z; origin group `c4-primary`; supports c4. After the reveal, display replica P-04 was recovered, checked and signed back into the prop inventory.
- **e10 — After the melt.** Independent Backstage Reporter; 2026-10-29T13:00:00Z; origin group `c4-observation`; supports c4. I watched the team recover the P-04 display piece and sign its return receipt after the midnight reveal.

**Research outcomes**

| Claim / move | Sources | Note |
|---|---|---|
| c1 / trace | e5 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c1 / second | e5, e6 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c1 / primary | e5 | The first-party record supports this specific claim. |
| c1 / fresh | e6 | A later, independent observation supports the same detail. |
| c2 / trace | e1 | This is the earliest version in the file. Notice what the original author actually observed. |
| c2 / second | e1, e2, e3 | Three publications, one underlying artifact. These reports repeat the same origin; they are not three independent confirmations. |
| c2 / primary | e4 | P-04 is a glass replica. The valuation belongs to the original J-01, which stayed off site. |
| c2 / fresh | e4 | The later primary record adds the missing context. P-04 is a glass replica. The valuation belongs to the original J-01, which stayed off site. |
| c3 / trace | e7 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c3 / second | e7, e8 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c3 / primary | e7 | The first-party record supports this specific claim. |
| c3 / fresh | e8 | A later, independent observation supports the same detail. |
| c4 / trace | e9 | The earliest record in this file describes the claim directly. Read the document for its scope. |
| c4 / second | e9, e10 | A primary record and a separately authored firsthand observation agree. These are two independent origins. |
| c4 / primary | e9 | The first-party record supports this specific claim. |
| c4 / fresh | e10 | A later, independent observation supports the same detail. |

**Witness: Val Laurent — The gala registrar.** Elegant, playful and exact about object identity. A sparkle is not an inventory number.

- **w1 — What does the tray code identify?** P-04 identifies the ice-display prop in the inventory.
- **w2 — Which object has the eight-million valuation?** The valuation certificate names J-01, the original necklace.
- **w3 — Who made the ice sculpture?** The production commission names Esme Frost.
- **w4 — Was the display recovered?** The prop receipt records P-04 checked back in after the reveal.
- **w5 — Was the original on site?** The custody record places J-01 in secured storage off site.

**Prepared artifact: The gala press-card photograph**

```text
FROST & FLAME
$8,000,000
THE MIDNIGHT REVEAL
display tray: P-04
VALUATION CARD SHOWN BESIDE DISPLAY
```

Before e4 is discovered: The valuation and tray code are adjacent. That does not establish that they refer to the same object.

After e4: P-04 is the display replica; J-01 is the valuable original. The press photograph put two different identities side by side.

**Verdict:** c2; decisive sources e1, e4. The photograph pairs a real valuation with the wrong object. P-04 is a glass replica used in the ice sculpture; the $8 million certificate belongs to J-01, safely off site. The returned display piece was the prop all along.

**Lesson:** Match the certificate to the object. Proximity is not provenance.

<!-- CASE_LIBRARY_END -->
