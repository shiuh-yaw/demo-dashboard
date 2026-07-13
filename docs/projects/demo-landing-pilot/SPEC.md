# Demo scenario page pilot — design (v2)

Phase 2 of the demos-surface effort (phase 1: dashboard public landing, PR #133).
**v2 (July 9, 2026):** direction change after the v1 hero-only landing was built
and reviewed on this branch — the demo's front door must *show* the product with
the integration story beside it, not pitch it behind a CTA. The target shape is
flow's scenario page (`apps/flow/app/checkout`): hero on top, live demo widget
left, integration/code panel right. v1's `DemoLanding` hero-only template is
removed; the v1 token canonicalization is unchanged and remains in this PR.

## Locked decisions

- Visual + structural target: **flow's scenario-page layout, 1:1** — eyebrow
  (`01 · <NAME> · DEMO`), clamp headline with accent phrase, pitch, route
  chips; then two columns: live widget (left), code panel with pill tabs and
  numbered steps (right).
- **No CTA gate.** The wallet widget (login card) is live on the page
  immediately. Signed-in users see their wallet in the left column with the
  page chrome intact (flow's model).
- **Shared primitives in `packages/ui`, generalized from flow** (not
  hand-rolled per app): scenario chrome, two-column layout, and the CodePanel
  family. Flow migrates to the shared versions in a **later PR**; its
  `ScenarioSwitcher`/`ComingSoon`/AI-dialog stay flow-local until then.
- Rework lands **on this branch / PR #140** (not a follow-up PR).
- v1 carry-overs that still bind: per-app content via props (no copy baked
  into shared components); `--brand-*` contract only (D-007), customer chrome
  via `?theme=` flows through; canonical token set per D-030 with the seven
  app pins; wallet-only pilot, rollout after Itai signs off.

## 1. Removed from the branch (v1 artifacts)

- `packages/ui/src/demo-landing.tsx` (`DemoLanding`, `DemoLandingSection`) and
  their barrel exports + AGENTS.md entries.
- `apps/wallet/components/wallet-home.tsx`, `apps/wallet/lib/home-surface.ts`,
  `apps/wallet/__tests__/home-surface.test.ts`,
  `apps/wallet/components/icons/wallet-illustration.tsx`.
- D-030's sentence naming `DemoLanding` as the token-role reference
  implementation is amended to name the scenario primitives instead.

The v1 hero *idiom* (clamp headline + accent in `--brand-accent`, pitch in
`--brand-fg-secondary`) survives inside `ScenarioHero`. Wallet's copy and
"what to try" bullets move into the hero.

## 2. New `packages/ui` primitives

Flat files, barrel-exported, presentation-only (no SDK imports, no hardcoded
hex, no cookies/headers, React peer dep — existing package invariants).

- **`scenario-chrome.tsx`** — `ScenarioEyebrow { num, name }` (mono uppercase
  line + DEMO chip), `RouteChip { icon, label, detail }`, `ChipArrow`, and
  `ScenarioHero { logo, eyebrow: { num, name }, title, titleAccent?, pitch,
  bullets?, chips? }` composing them. Visual language copied from flow's
  `scenario-chrome.tsx` / scenario-page heroes, all `--brand-*` tokens.
  Decorative accents ride `--brand-accent` (D-030 role mapping).
- **`scenario-layout.tsx`** — `ScenarioLayout { demo, panel }`: the
  two-column grid (demo left, panel right on `lg`; stacked demo-first on
  mobile), `max-w-6xl px-6` container, `min-h-dvh bg-(--brand-page-bg)` root,
  optional `footer` slot (e.g. `PoweredByFooter`).
- **CodePanel family**, generalized from `apps/flow/components/`:
  - `code-panel-types.ts` — flow's typed content contract (`CodeStep`,
    pane props), with code carried as **pre-highlighted HTML strings**
    (`html`) plus raw `code` for copy. No Shiki dependency in the package —
    apps highlight server-side.
  - `code-panel-atoms.tsx` — `CodeFrame` (dark code block rendering the
    provided HTML, filename bar, copy button using ui's own `CopyButton`),
    step/doc-link atoms.
  - `code-panel-stepper.tsx` — numbered steps (`01 Create…` + Docs arrow +
    body + code frame).
  - `code-panel.tsx` — `"use client"` orchestrator: hand-rolled pill tab row
    (droplet `Tabs` replaced; same pill styling), tabs render only for panes
    provided (`sdkSteps`, `apiSteps`, optional `webhooks` pane), URL-hash
    deep links (`#sdk`, `#api`, …) preserved, generic `notice` slot replacing
    flow's bespoke notices.

Not lifted (stay flow-local until flow's migration PR): `ScenarioSwitcher`,
`ComingSoon`, `code-panel-ai-dialog.tsx` (disabled behind `SHOW_AI_CHIP`),
helpers/webhooks panes' flow-specific content components.

## 3. Wallet composition

- `apps/wallet/app/page.tsx` (server component):
  1. Highlights wallet's snippets server-side via a new
     `apps/wallet/lib/code-highlight.ts` (flow's `createHighlighter`
     singleton pattern; `shiki` added to wallet's deps — the only new
     dependency, matching flow's pinned `1.24.0`).
  2. Renders `ScenarioHero` — title "A wallet your users control.", accent
     "No seed phrase required.", pitch. Post-review trims (July 9–10): no
     eyebrow line, no route chips, no "what to try" bullets on wallet (all
     remain optional `ScenarioHero` props for flow's migration); no hero
     logo under default chrome — branded `?theme=` configs surface their
     logo via the `ScenarioBrandLogo` client island (null otherwise).
  3. Renders `ScenarioLayout` with `header` = shared `SiteHeader`
     (dashboard-landing chrome from packages/ui; chip carries the demo
     name, "Wallet"; home links to dynamic.dev), `demo` = the existing
     wallet widget island (`WalletApp`, exactly today's in-widget behavior:
     auth card → dashboard → send/scan/history), `panel` = `CodePanel`,
     and `footer` = shared `SiteFooter`. The sticky widget offset accounts
     for the 80px header (`lg:top-[104px]` when a header is passed).
- Panel content module `apps/wallet/lib/code-steps.ts` (wallet-owned,
  per-app-content rule): **SDK tab only** — most demos have no public API
  story, so the panel is SDK-only (the `CodePanel` tab row auto-hides with
  a single pane; `apiSteps` stays an optional prop for flow's migration).
  5 steps mirroring the real implementation (create client singleton →
  email OTP start/verify → embedded wallet ready → sign a transaction →
  JWT-bound API fetch), the last step using an illustrative
  `your-app/api-client.ts` filename since wallet has no protected route
  yet. No webhooks/helpers tabs in the pilot.
- Panel affordances (step-number circles, docs links) ride `--brand-accent`
  so they stay visible under charcoal-primary customer brands, matching
  flow's look (D-030 role mapping updated accordingly).
- Post-review (July 10): wallet's pre-D-030 charcoal `--brand-*` value
  overrides were deleted from `app/globals.css` — the default chrome now
  IS the canonical D-030 flow palette (blue primary); only the
  `--widget-*` compat aliases remain, and `?theme=` overrides still
  layer via `<ThemeStyleTag>`.
- No gate, no swap state: auth transitions happen inside the widget as they
  do today. `/jwt` and all other routes untouched.

## 4. Mobile

Flow's scenario-page behavior: single column below `lg`, widget above the
code panel, hero clamp scales down. Verify at 375px.

## 5. Testing & verification

- Remove the gate tests; add node-env tests for `lib/code-steps.ts`
  (every step has title/body/code/html non-empty; docs URLs well-formed) and
  for `code-highlight.ts` (output HTML contains a known token).
- Existing wallet suite stays green; `packages/ui` still has no harness
  (compile check via `tsc --noEmit`; known gap).
- Browser verification: desktop scenario page (hero, live login card, panel
  tabs + code render), sign-in happens in place, 375px stacking, `/jwt`
  unchanged. Full `pnpm turbo typecheck lint test`.

## 6. Docs updated on the branch

- `packages/ui/AGENTS.md` — remove DemoLanding entries; add scenario
  primitives + CodePanel contract (pre-highlighted HTML, no Shiki here).
- `apps/wallet/AGENTS.md` — scenario page, shiki dep, code-steps module.
- `docs/projects/demo-meta-system/DECISIONS.md` — amend D-030's reference-
  implementation sentence; no new decision number (direction, not policy).
- `PLAN.md` in this directory is superseded by a v2 plan; PR #140
  description updated to describe the scenario-page pilot.

## 7. Q-017 slice 1 — in-card JWT generator + context-aware panel (July 10)

The widget's "Generate a test token" link opened `/jwt` in a new tab,
breaking the scenario-page experience. This slice moves the generator
in-card and pilots the Q-017 mechanism (panel follows the widget).

- **Widget:** new `{ type: "jwt-generator" }` navigation screen (+
  `goToJwtGenerator()`), treated as an auth-family screen (pre-auth
  reachable; sign-in success auto-redirects via the existing `isLoggedIn`
  effect). `components/screens/jwt-generator-screen.tsx` ports the `/jwt`
  card content (subject/email inputs, Generate, Generate & Sign In, token
  display/copy/decode, config-error message) into the `WidgetCard` with a
  back affordance to the login screen; no `router.push`.
- **LoginForm (packages/ui):** new `onJwtHelperClick?: () => void` — when
  set, "Generate a test token" renders as an in-place button (no
  external-link icon) instead of the `jwtHelperHref` anchor. Wallet passes
  the navigation call; `jwtHelperHref` consumers unchanged.
- **Panel bridge (the Q-017 mechanism):** wallet-local client context
  (`PanelStateProvider` / `usePanelSection`, `"default" | "jwt-setup"`)
  wraps the RSC-composed `ScenarioLayout` in `page.tsx` so both islands
  share it. `page.tsx` builds TWO server-highlighted panels (existing SDK
  panel; new JWT-setup panel from `WALLET_JWT_SETUP_STEPS`: generate
  keypair script → serve JWKS via ngrok → configure the external-auth
  provider in the Dynamic dashboard → mint via `POST /api/dev/jwt` →
  `signInWithExternalJwt`, with a dev-only `PanelNotice`). A small client
  `WalletPanel` switcher picks by context state. The `jwt-generator`
  screen sets `"jwt-setup"` on mount and restores `"default"` on unmount.
  **packages/ui stays presentational; the screen→panel mapping is wallet
  content** (Q-017 sketch honored).
- **`/jwt` route:** unchanged, deep-linkable dev tool; only the widget
  link stops opening it. Candidate for retirement in a later PR.
- **Testing:** node-env tests for `WALLET_JWT_SETUP_STEPS`; browser loop
  (link → card + panel swap; back → both restore; Generate & Sign In with
  configured keys → dashboard).

## Out of scope

- Migrating flow to the shared primitives (follow-up PR).
- Webhooks/Helpers tabs for wallet; AI-prompt chip.
- Rollout to other demos (after Itai sign-off).
- The v1 token canonicalization is already on the branch and is not re-opened.
- Q-017 beyond slice 1 (send-tx/login step highlighting) — the context
  mechanism above is the foundation; further mappings come with rollout.
