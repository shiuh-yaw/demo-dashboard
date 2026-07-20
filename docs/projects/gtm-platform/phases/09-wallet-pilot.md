# Phase 09 - Wallet pilot instrumentation

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (Tracker, pilot scope), `../PLAN.md` (client API contract), and `apps/wallet/AGENTS.md` in full.

## Your role

Make `apps/wallet` the first tracked demo: mount the tracker, define and emit its milestone taxonomy, and render the book-a-call CTA. This is the end-to-end proof of the whole platform - after this PR plus Phase 08, the DESIGN.md success criterion is testable.

One logical PR. **Wallet only** - no other app is instrumented in v1.

## Wave + dependencies

- Wave 4, after Phases 02 (package), 05 (context endpoint), 06 (ingest).

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-09-wallet-pilot`, branch `gtm/09-wallet-pilot`.
2. `superpowers:test-driven-development` for milestone emission points.
3. `verify` / `run` - actually drive the wallet demo locally against a local dashboard and observe rows land; screenshot or log excerpt in the PR.
4. `superpowers:requesting-code-review`.

## Hard rules

- The tracker must not alter any existing wallet behavior: no layout shift (CTA is fixed-position), no new blocking requests, no interference with the theme cookie middleware or Dynamic SDK init.
- Milestone names are the wallet's published event taxonomy - snake_case, stable, documented in `apps/wallet/AGENTS.md` in this PR. Renaming later is a breaking analytics change.
- `props` carry no PII and no secrets: amounts and asset symbols are fine; addresses truncated (`0x1234...abcd`); never full private data. No raw addresses in props.
- Milestone emission is fire-and-forget - never `await` a track call in a user-facing flow.

## Required reading before code changes

- `apps/wallet` layout + middleware (theme cookie handling), auth callback, send flow, backup flow (recent commits: gdrive backup settings, tap-balance max amount, token balances via Alchemy).
- `packages/analytics` README/AGENTS.md + exports (Phase 02).
- `.env.example` conventions for the wallet app.

## What needs to happen

1. **Mount**: `<GtmTracker demoSlug="wallet" />` in the wallet root layout (client boundary as needed); `<BookACallCta />` alongside it. `NEXT_PUBLIC_TRACK_URL` added to wallet env validation + `.env.example` placeholder. Unset -> tracker no-ops (Phase 02 guarantee); assert the app builds and runs without it.
2. **Milestone taxonomy** - implement exactly these, at these moments:
   - `signed_in` - Dynamic auth success (no email in props; identity stays share-link-only per DESIGN.md decision 2).
   - `wallet_funded` - first balance > 0 observed after sign-in (session-local dedupe).
   - `send_initiated` - send form submitted; props `{ asset, amount }`.
   - `send_completed` - tx result success; props `{ asset, amount }`.
   - `backup_completed` - Google Drive backup finishes.
   - `receive_viewed` - receive screen opened.
   Steps (`useTrack().step`) for major screens only if the automatic pageviews don't already distinguish them (check the router structure first - avoid double-counting).
3. **AGENTS.md**: new "Analytics taxonomy" section listing every milestone, its trigger, and props shape. Note the tracker mount + env var under Required environment.
4. **Tests**: emission-point tests per existing wallet test patterns (mock `useTrack`; assert `send_completed` fires on the success path and NOT on failure; assert `signed_in` fires once per session). Type-level test that all emitted names are in the taxonomy union (define a `WalletMilestone` string-literal union in one place).
5. **End-to-end verification** (documented in PR): local dashboard + local wallet; mint a share link for a test prospect; open it; sign in, send on Base Sepolia; show the `VisitorSession` + `TrackEvent` rows (or Phase 08 drawer if merged) with attribution + milestones + CTA screenshot.

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] Wallet builds and runs with `NEXT_PUBLIC_TRACK_URL` unset (no-op mode).
- [ ] All six milestones fire at their defined moments (tests + e2e evidence).
- [ ] CTA renders on a share-link session with a scheduling URL, absent otherwise.
- [ ] No raw wallet addresses or emails in any event prop (grep + test).
- [ ] `apps/wallet/AGENTS.md` documents the taxonomy in this PR. spark26 untouched.

## PR title

`feat(wallet): Phase GTM-09 - pilot analytics instrumentation + book-a-call CTA`

## After merge

Update `../PROGRESS.md`. With 08 merged, execute the DESIGN.md success-criteria walkthrough.

## Out of scope

- Instrumenting any other app (fleet rollout is post-v1). Email-carrying `signed_in` (contract supports it; explicitly disabled per DESIGN.md).
