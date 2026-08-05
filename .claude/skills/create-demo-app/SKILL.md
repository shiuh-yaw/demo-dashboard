---
name: create-demo-app
description: Use when the user asks to build any new app, flow, or demo in this monorepo (the `dynamic-demos` workspace under `apps/`). Triggers on "create a demo for...", "make a stablecoin sandwich demo", "scaffold a remittance demo for X", "build me a new demo app", "build a {neobank, savings, earn, remittance, offramp, onramp, swap, checkout, wallet, trading, payouts, payins} app/flow/feature", "new app under apps/", "spin up a customer-branded demo", "scaffold a payment-flow demo". **Use this skill INSTEAD OF `superpowers:brainstorming` whenever the user is building something new for this monorepo** — it has its own scoping + clarification flow specific to this project's composition architecture (existing packages, dashboard API, magic-send, theme cookie, demo-registry). Reads .claude/demo-registry.json to know what's available.
---

# create-demo-app

You are scaffolding a new demo app for the `dynamic-demos` monorepo. The user has asked you to build a new payment-flow demo. Your output is a PR containing a complete Next.js app plus a dashboard section.

**Hard invariants:**

- Zero file changes for failure-mode classes 1, 2, 4.
- Zero file changes until the user resolves the prompt for classes 3, 5.
- Never commit to `main`. Always work on a fresh `skill/<demo-type>-<timestamp>` branch.
- Never auto-merge.
- Sandbox-by-default credentials unless the user explicitly requests production AND the PR title includes `[prod-creds]`.

## Step 1 — Required reading

Read these before parsing the user's intent:

1. `.claude/demo-registry.json` — canonical inventory of provider packages and demo apps with `flow_role`, `regions`, `provider`, `status` frontmatter.
2. `docs/projects/demo-meta-system/DECISIONS.md` — especially D-003 (Dynamic + Fireblocks app-direct), D-005 (sandbox by default), D-012 (skill PR convention), D-025 (failure modes), D-027 (Dynamic SDK source is authoritative).
3. `docs/projects/demo-meta-system/GLOSSARY.md`.
4. `docs/templates/demo-spec.schema.json` — the intent contract.
5. **`packages/dynamic/AGENTS.md`** — always required, not lazy. Every demo authenticates users via the Dynamic SDK per D-003; the generated demo MUST wire auth via the primitives this package exposes (`createDemoMiddleware`, `ConnectedAuthScreen`, `<DynamicInit />`, `<DynamicAuthProvider>`, JWT cookie helpers).
6. Lazily read each named-provider package's `AGENTS.md` only when the user's intent references that provider.

## Step 2 — Parse intent

Extract the following from the user's prompt. Anything not present becomes a gap to fill in Step 4 — except `Brand`, which silently defaults if the user didn't mention branding (see "Brand handling" below).

| Field | Example |
|---|---|
| Flow segments | `{onramp: true, wallet: optional, bridge: optional, offramp: true}` |
| Source corridor | country=US, currency=USD, rail=ach |
| Destination corridor | country=BR, currency=BRL, rail=pix |
| Brand | existing `brandId` from the dashboard, or "new (name)", or `default` (silent default if user didn't mention it) |
| Custody preference | `non-custodial` / `custodial` / `mixed` / `unspecified` |
| Demo name | kebab-case (e.g. `acme-cashout`) |
| Visual reference | optional. Named app ("like Coinbase Exchange", "Uniswap-style"), attached image, or descriptive language ("dark theme, neon accents, dense data tables"). See "Visual handling" below. |

### Brand handling

Brand is internal vocabulary the user shouldn't need to know about. **Do not ask about brand as a gap-fill question.** Apply these rules instead:

- If the user's prompt explicitly references branding (e.g. "for Acme", "with the Beta Pay theme", "white-label as Customer X"): treat that as the brand value and use it.
- Otherwise: silently default to `default` (the existing default brand record in the dashboard).
- In the Step 7 resolution plan, always include a one-line note: `"Brand: default — every instance of this demo type can be themed/rebranded in the dashboard after scaffold."` Mention this even if the user did supply a brand, so they know rethemeing per-instance is supported.

### Visual handling

Visual reference and brand are **orthogonal**. Brand controls colors/logo/typography tokens (the `Brand` row's theme fields). Visual reference controls layout / density / affordances / component patterns ("dense exchange UI" vs "minimal swap card" vs "wallet-card stack").

**Do not ask about visual reference as a gap-fill question** — if the user didn't mention it, generate utilitarian Tailwind UI by default and move on. If they did mention it, capture it as a `visualReference` value.

**REQUIRED SUB-SKILL when `visualReference` is set:** Use `superpowers:frontend-design` to guide the UI generation portion of Step 8. The way this works in the superpowers ecosystem (mirrors how `writing-plans` references `executing-plans`):

- Before writing any page or component body in `apps/<kebab>/src/app/**` or `apps/<kebab>/src/components/**`, read `superpowers:frontend-design`'s SKILL.md (via the Skill tool — this loads its instructions into your working context). Apply its heuristics throughout the UI-generation step.
- Carry these inputs across to the design work: the `visualReference` value (named app, image content if attached, or descriptive prose), the flow + corridor + custody context (so the design surfaces the right components — amount input, status, balance), and the brand's theme tokens (so generated CSS respects brand colors even when matching another app's layout).
- The dashboard section (`apps/dashboard/src/app/<kebab>/...`) stays plain — operator UI is not user-facing, no need to design-match it. Skip `frontend-design` for those files.

Acceptable forms of `visualReference`:

- **Named app**: "like Coinbase Exchange", "Uniswap style", "Stripe Checkout aesthetic". Use `frontend-design`'s pattern knowledge.
- **Attached image**: the user attaches a screenshot in the Claude Code session. Read it with the `Read` tool (Claude Code supports image input). Carry the visual cues into the design work.
- **Descriptive prose**: "dark theme, neon accents, dense data tables". Apply verbatim.

If the user is in an environment without `superpowers:frontend-design` available, fall back to plain Tailwind UI and add a TODO comment in the generated `page.tsx`: `// TODO: user requested <visualReference> aesthetic — iterate with frontend-design skill in a follow-up.`

## Step 3 — Match against the registry

For each flow segment the user wants:

1. Filter `demo-registry.json` by `flow_role` matching the segment (`onramp`, `offramp`, `bridge`, etc.).
2. Filter by `regions[]` covering the corridor.
3. Classify the result:
   - **0 matches** → failure class 1 (no provider matches corridor). STOP. Output the error per the format in §"Failure mode responses" below.
   - **0 matches AND user named a specific provider** → failure class 2 (named provider wrong region). STOP. Output the alternatives suggestion.
   - **≥2 matches AND user did not name a specific provider** → failure class 3 (ambiguous). Proceed to Step 4's disambiguation handling.
   - **1 match** OR **≥1 match AND user named one of them** → proceed.

### Recognized composition patterns

Some demo intents map to **composition patterns** that don't decompose into the standard flow segments. Recognize these by keyword and scaffold accordingly. Hard rule: never invent destination-protocol packages for these; the destination is calldata the demo composes (see `project_magic_send_primitive`).

#### Magic-send

**Trigger keywords:** "magic send", "magic spend", "gasless", "gasless yield", "vault-funded gasless", "deposit through embedded wallet", "fund from vault and deposit", any prompt that describes the shape `custodial source → user's embedded wallet → onchain action`.

**The pattern:**

```
custodial vault wallet (server-side, holds asset, pays nothing)
   └─ server-initiated ERC-20 transfer
        ▼
user's Dynamic embedded wallet (EOA)
   └─ user signs gasless intent via Dynamic SDK
        ▼
destination contract (Aave / Morpho / ERC-20 transfer / swap / NFT mint / …)
```

**Hard rules:**

- **EIP-7702 only**, never ERC-4337. See `project_eip7702_only` memory. Use `@dynamic-labs-sdk/zerodev` in 7702 mode (`createKernelClientForWalletAccount` + `sendUserOperation`). Do NOT design a custom `UniversalGaslessDelegate` contract or a custom relayer service — Dynamic's SDK already implements the mechanism.
- **Destinations are calldata, not packages.** Do NOT create `packages/aave/`, `packages/morpho/`, `packages/<destination>/`. The demo app composes the destination calldata inline (e.g. encode `supply(asset, amount, onBehalfOf, ref)` via viem) and hands it to the gasless executor. See `project_magic_send_primitive`.
- **Vault wallet** can be either `@dynamic-demos/fireblocks` (custodial) or an env-config'd EOA, depending on which the user names. If unspecified, ask.

**Composition the skill scaffolds:**

- `apps/<kebab>/` — Next.js demo app that:
  - Authenticates via Dynamic (per "Auth wiring").
  - Imports `@dynamic-labs-sdk/zerodev` for `createKernelClientForWalletAccount` + `sendUserOperation`.
  - Imports `@dynamic-demos/fireblocks` (or wraps a server-side EOA) for the vault.
  - UI shows: balance from vault, destination selector, amount input, "execute" button. Action triggers `POST /api/magic-send/intents` (see API contract below), then polls `GET /api/magic-send/intents/[id]` until `state=confirmed`.
- Dashboard API surface for magic-send (shared across all magic-send demos — see "Dashboard API contract" below).
- `apps/<kebab>/AGENTS.md` with `flow_role: gasless-yield` (or similar new role) and a Destinations section listing the protocols the demo targets.
- Standard kind registration in the dashboard unions.

**Dashboard API contract.** Magic-send demos share these endpoints under `apps/dashboard/src/app/api/magic-send/...` (not per-demo — the contract is the same regardless of destination):

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/magic-send/intents` | POST | User submits signed intent + destination calldata. Server validates signature, debits credit (if applicable), persists intent, kicks off vault → user transfer. Returns `intent.id`. |
| `/api/magic-send/intents/[id]` | GET | Poll status (`initialized` → `submitted` → `confirmed` / `failed`). Returns the transaction record + any refs (transfer tx hash, userop bundle hash). |
| `/api/magic-send/intents/[id]/execute` | POST | Internal, server-only — fires after vault transfer confirms. Submits the userop via Dynamic's ZeroDev SDK in 7702 mode. Not exposed to clients. |
| `/api/magic-send/credits/[userId]` | GET | Current credit balance for the user. May be derived from transaction history or stored as an explicit row. |
| `/api/webhooks/magic-send` | POST | Optional — receives confirmation events from the paymaster or external relayer (if any). Lands as a `WebhookEvent` row. |

All endpoints require `Authorization: Bearer <jwt>` + `x-dynamic-environment-id` header per D-004.

**Storage — split by lifetime.** Reuse what already exists; do NOT introduce a new Postgres table.

| State | Lifetime | Where |
|---|---|---|
| Pending intent (signed, vault transfer not yet executed) | seconds–minutes | **Redis** with TTL — same pattern apps use for transient state |
| Idempotency keys (client retries don't duplicate executions) | hours | **Redis** with TTL |
| Transaction history (final record, hashes, status, audit) | forever | **Postgres** `Transaction` model — add `kind: "magic-send"` (or per-destination: `magic-send-aave`, `magic-send-morpho`, etc.). `payload` JSON carries destination address + calldata + amount + vault id. `refs` JSON carries the USDC transfer tx hash + ZeroDev bundle hash. `state` validated by `@dynamic-demos/transactions` state machine. |
| Per-user credit / vault allocation | medium-lived, queryable | **Postgres** — derive on-read from `Transaction` history, OR add a small `MagicSendCredit` table if the per-user balance is non-trivial to compute. Default to derive-on-read. |
| Webhook receipts | forever, audit | **Postgres** `WebhookEvent` model (already exists) — `provider: "magic-send"` or the upstream paymaster name |

**Why no new table:** the Postgres `Transaction` model from Phase 2 has a `kind` discriminator + permissive `payload` / `refs` JSON specifically so new flow types can land without migrations. Magic-send fits exactly. Adding a new table would duplicate state-machine wiring without benefit.

If the demo is a one-off and intent tracking isn't useful (e.g. fire-and-forget, no polling UI), omit the `/intents` endpoint set and call `sendUserOperation` directly from the demo app's server actions. Reserve the API for demos that actually need server-mediated state.

**Gap-fill specific to magic-send (these are valid even though Step 4 normally prefers a small number of gaps):**

- Which destination(s)? (Aave, Morpho, ERC-20 transfer, swap, NFT mint, custom calldata)
- Which chain? (Base recommended — Dynamic's gasless support is most mature there; mainnet/Polygon/Arbitrum also possible)
- Which asset on the vault? (USDC recommended)
- Which vault source? (Fireblocks vault account vs env-config'd EOA)

**What the skill does NOT create for magic-send:**

- Custom EIP-7702 delegate contracts or ABIs.
- Custom paymaster / relayer services.
- Per-destination packages (`packages/aave/`, `packages/morpho/`, etc.) — the missing-piece prompt (Step 5) is **not** triggered for destination protocols in a magic-send demo. Destinations are calldata, full stop.

If `magic-send` is the user's pattern and a destination they named has no obvious calldata-encoding path (e.g. they ask for a protocol whose contracts you don't recognize), ask for the contract address + ABI JSON in a gap-fill question. Do not scaffold a wrapper package for it.

## Step 4 — Gap-fill questions

For any field in Step 2 that's missing (except `Brand` — see "Brand handling" above; never ask about brand), OR for ambiguous matches in Step 3, ask ONE short question with options + a recommendation. Resolve all such gaps before moving on to Step 5; do not assume defaults silently.

Practical guidance:

- Ask only what's genuinely unknown. If the user's prompt implies an answer, take the implied value and don't re-ask.
- Combine naturally-related gaps into a single question when it doesn't lose clarity (e.g. "demo name + custody"). Don't force-combine unrelated gaps.
- Keep each question concise: one line of context + 2–4 numbered options + one recommendation with a one-line reason.
- If a gap has many reasonable answers (e.g. demo name), include "Type something" as one option so the user can provide a free-form answer.

Question format:

```
<one-line description of the gap>
Options:
1) <option a>   ← recommended (reason)
2) <option b>
3) <option c>
Pick one.
```

Wait for the user's response before continuing.

## Step 5 — Missing-piece prompt (class 5)

If the user named a specific provider that is **not in `demo-registry.json` AND has no obvious external integration path** (e.g. unfamiliar service), prompt:

```
I don't have a package or known integration for "<provider>". Options:
1) Create a full packages/<provider>/ wrapper that surfaces this provider through the dashboard API (recommended — every future demo can use it). I'll read <provider>'s docs, generate a lightly-opinionated TypeScript client + types, wire dashboard endpoints under /api/<provider>/..., and write an AGENTS.md pointing at the external docs.
2) Wire <provider> directly in the demo app's code (fast escape hatch — use for genuine one-offs).
3) Abort.
Pick one.
```

Wait for the user's response. Zero file changes until they pick.

If the user picks (1), include a **full** `packages/<provider>/` wrapper in the PR. Step 8 below describes how to scaffold it. Option (1) is the canonical path per the composition architecture (see `docs/projects/demo-meta-system/DECISIONS.md` and the `project_composition_architecture` memory) — packages wrap external services and are surfaced through the dashboard API.

If the user picks (2), do not create any package. The demo app's own code imports the external SDK or hits the external API directly. This is the D-003 carve-out pattern (already used for Dynamic and Fireblocks) and is reasonable for one-off integrations.

## Step 6 — Out-of-scope detection (class 4)

If you cannot map the user's intent to a payment flow at all (e.g. "build me a Twitter clone", "set up CI", "write a blog post"), STOP and output the class-4 response per §"Failure mode responses" below. Zero file changes.

## Step 7 — Confirm the resolution plan

Before any file write, present a concise plan to the user:

```
Resolution plan:
- Demo name: <kebab>
- Brand: default — every instance of this demo type can be themed/rebranded in the dashboard after scaffold.
- Flow segments + chosen package + integration pattern:
  - onramp: <package> (dashboard-orchestrated | app-direct via package | app-direct external)
  - bridge: ...
  - offramp: ...
- Corridor: <src> → <dst>
- Visual: plain utilitarian Tailwind (default) | <reference> via superpowers:frontend-design
- Auth: auth-on-action (inline Dynamic widget) | server-side cookie gate (/login + ConnectedAuthScreen) | client-side widget — chosen per the "Auth wiring" table in Step 8 based on the flow shape.
- Sandbox credentials: yes

Files to be created:
- apps/<kebab>/  (Next.js demo app)
- apps/dashboard/src/app/<kebab>/  (dashboard section)
- 3 edits to dashboard union files (types.ts, demo-config-schemas.ts, dashboard.ts)
- 1 edit to apps/dashboard/src/components/sidebar.tsx (nav entry)
- apps/<kebab>/AGENTS.md
- .claude/demo-registry.{md,json} (regenerated)

Proceed? (yes / revise)
```

If the user *did* supply a brand in their prompt (Step 2 picked it up), replace the `Brand:` line with `Brand: <name> — additional themes/rebrands available per-instance in the dashboard after scaffold.`

Wait for confirmation. If the user revises, restart at Step 4.

## Step 8 — Generate files

On a fresh branch `skill/<kebab>-<unix-timestamp>`:

1. **If Step 5 picked option (1) — scaffold a full new package** for the missing provider before generating the demo. See `Scaffolding a new package` below. Re-run `pnpm exec node scripts/generate-demo-registry.mjs` once the package's `AGENTS.md` is in place so the registry reflects the new entry before downstream steps reference it.
2. Write the demo app under `apps/<kebab>/` with a functional flow (auth + form + submit + status display per the spec's §3 acceptance — "functional scaffold, utilitarian UI"). Wire to the integration pattern chosen in Step 7 for each segment. **Always wire Dynamic auth** — see "Auth wiring" below; the demo MUST have a working sign-in surface, not just styled chrome. **If `visualReference` was captured in Step 2, apply `superpowers:frontend-design`'s heuristics as a REQUIRED SUB-SKILL** per the "Visual handling" subsection — read its SKILL.md before writing any page/component body and use its guidance for `src/app/**` and `src/components/**`. Otherwise generate plain Tailwind UI.
3. Write the dashboard section under `apps/dashboard/src/app/<kebab>/` (list page, new page, detail page, config editor, client component, API route, server actions, mapper). Model after `apps/dashboard/src/app/remittance/...` only for shape and patterns — do not blindly copy.
4. Edit `apps/dashboard/src/lib/services/types.ts` to append `| "<kebab>"` to the `DemoConfigKind` union.
5. Edit `apps/dashboard/src/lib/services/demo-config-schemas.ts` to append `"<kebab>"` to `DEMO_CONFIG_KINDS` and add a per-kind member to the discriminated union.
6. Edit `apps/dashboard/src/lib/types/dashboard.ts` to append `<Type>Config` and `Stored<Type>Config` interfaces with demo-specific shape decided at scaffold time.
7. Edit `apps/dashboard/src/components/sidebar.tsx` to add a nav entry.
8. **Wire the chrome contract** - `buildScenarioChrome()` from `@dynamic-demos/ui`, see "Branding wiring" below. Not the individual primitives.
9. **Wire analytics** - see "Analytics wiring" below. Both halves are required: `<GtmTracker>` in the layout AND `milestone()` calls on the flow's funnel steps. A layout tracker alone ships a demo that records pageviews and nothing about whether anyone completed the flow.
10. Write `apps/<kebab>/AGENTS.md` per `docs/templates/AGENTS.template.md`, including its **Analytics taxonomy** table.
11. Run `pnpm exec node scripts/generate-demo-registry.mjs` to regenerate `.claude/demo-registry.{md,json}`.

### Branding wiring (mandatory for Step 8.8)

**Every demo is themeable per prospect. This is not optional and not a follow-up.** A demo that can't be handed to a prospect under their brand is not finished.

**Use `buildScenarioChrome()` from `@dynamic-demos/ui`. Do not assemble `SiteHeader` / `ScenarioBrandRow` / `ScenarioBrandImage` / `ResetThemeButton` / `SiteFooter` by hand.** The helper returns all four slots from one input, because `header` and `heroLogo` are two halves of one decision - a branded page drops the marketing header, so if you drop it without adding the brand row the page has no header at all. That exact bug shipped more than once.

```tsx
const { config } = await getMyDemoConfig();
const chrome = buildScenarioChrome({
  chip: "MyDemo",
  isBranded: Object.keys(config).length > 0,
  brandLogoUrl: config.branding?.logoUrl,
});

<ScenarioLayout
  header={chrome.header}
  hero={<ScenarioHero logo={chrome.heroLogo} title="..." pitch="..." />}
  demo={<><MyWidget />{chrome.reset}</>}
  footer={chrome.footer}
/>
```

Two things that are easy to get wrong and produce a silently unbranded page:

- **Pass `dashboardUrl` to `fetchDemoConfig` explicitly.** Its fallback sniffs `DASHBOARD_URL` / `NEXT_PUBLIC_DASHBOARD_URL` / `NEXT_PUBLIC_DASHBOARD_API_URL` / `NEXT_PUBLIC_API_BASE_URL`. If the app validates a different name (connect used `DASHBOARD_API_URL`), the fetch never happens, a warning goes to the server log, and the browser renders the default palette. Resolve the config in ONE `React.cache`'d module and import it - a second unconfigured call site is how half a fix persists.
- **The stored branding keys are `logoUrl` and `appName`,** not `WidgetBranding`'s `logo` and `name`. Typing the config as a plain `WidgetConfig` compiles and reads `undefined`. Declare the shape the dashboard actually writes.

Also required for the demo to be brandable at all: a `connect`-style entry in `LANDING_DEMOS`, an entry in `CONFIGURABLE_KIND_TO_DEMO_TYPE`, and a creation branch in `createProspectDemoConfigs`. Without the last one the prospect picker lists the demo and creating it silently does nothing.

Enforced by `packages/theme/src/__tests__/scenario-chrome-contract.test.ts`, which scans every app composing `ScenarioLayout`.

### Analytics wiring (mandatory for Step 8.9)

Every demo is a GTM instrument, so "did anyone finish it?" has to be answerable. `@dynamic-demos/analytics` is no-op with `NEXT_PUBLIC_TRACK_URL` unset, so this is always safe to wire and needs no env guards.

**Both halves are required. The first without the second is the failure mode this section exists to prevent** - `apps/connections` shipped with a layout tracker and zero funnel events, which looks instrumented in `package.json` and measures nothing:

1. **Layout tracker.** `<GtmTracker demoSlug="<kebab>">` wrapping the tree in `app/layout.tsx`. Gives pageviews + heartbeats, package-owned.
2. **Funnel milestones.** `lib/analytics/milestones.ts` exporting a `const [...] as const` string-literal union, and `useTrack().milestone(name, props)` fired at each step of the flow the demo exists to demonstrate. Model on `apps/wallet/lib/analytics/milestones.ts`.

**Choosing the events.** Instrument the funnel, not the UI: the steps where a user can drop out, ending with the one that means the demo succeeded. Reuse an existing name (`signed_in`, `authenticated`, `wallet_funded`, …) whenever the semantics match - cross-demo comparability is the point, and shared names give person-level join keys. Where a flow splits one logical step into two screens, make them two events; the gap between them is the measurement.

**Never put these in props:** wallet addresses, emails, transaction hashes, or anything else that identifies a person or their funds. Identity stays share-link-only. Props are for shape (asset, chain, amount bucket, scheme), not identity.

**`<BookACallCta />`** is a judgment call, not a default. Mount it only if the app has no Book-a-call in its header or hero, and never on a surface that ships inside an integrator's iframe.

### Auth wiring (mandatory for Step 8.2)

Every demo authenticates users via the Dynamic SDK (D-003 — apps hold their own Dynamic credentials). The skill MUST wire a real auth surface — never ship a demo with a "Connect"-styled button that does nothing or an `/api/*` proxy that 401s with no UI path to recover.

**Decide the auth pattern based on the flow:**

| Pattern | When | Primitives | Reference |
|---|---|---|---|
| **Auth-on-action (public landing + auth on intent)** | Onramp / checkout / public-browse demos where the user can preview the surface before signing in (e.g. browsing rates) | Inline Dynamic SDK widget on the action button. `createDemoMiddleware({ loginPath: false, ... })` so the middleware does not redirect public visitors | `apps/checkouts/` for inline-widget pattern |
| **Server-side cookie gate (auth-first)** | Wallet / earn / proceeds / KYC-gated flows where the user has nothing meaningful to see while logged out | `createDemoMiddleware({ loginPath: "/login", publicRoutes: ["/login"], ... })` plus a `/login` page using `ConnectedAuthScreen` from `@dynamic-demos/dynamic` and the JWT cookie helpers. **`/login` MUST be in `publicRoutes` — see "Avoiding redirect loops" below.** | `apps/proceeds/lib/dynamic/*` for the canonical ConnectedAuthScreen wiring; `apps/remittance/` for the screen state machine |
| **Client-side widget (auth-anytime)** | Wallet UIs where the SDK's hosted widget covers the whole flow | `<DynamicInit />` + `<DynamicAuthProvider>` at the root; render the SDK widget where sign-in belongs | `apps/wallet/` |

**For all three patterns**, the skill MUST generate:

a. `apps/<kebab>/.env.example` with the required Dynamic env vars: `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` (sandbox value), any project-specific URL env. Read `packages/dynamic/AGENTS.md` for the canonical list per pattern.

b. `apps/<kebab>/middleware.ts` configured to match the pattern. If `loginPath: false`, comment why (auth-on-action).

c. **A working sign-in affordance.** No bare "Connect" buttons. For auth-on-action, the button calls `setShowAuthFlow(true)` (or equivalent) on the Dynamic context. For server-side cookie gate, `/login` page exists and renders `ConnectedAuthScreen`.

d. JWT cookie sync if the demo calls any dashboard endpoint (`/api/<provider>/...` routes verify the cookie). Use `setDynamicJwtCookie` from `@dynamic-demos/dynamic/auth-cookies` after successful sign-in.

e. A visible logged-in state — at minimum the connected wallet address or email truncated in the top chrome, so the user can confirm auth succeeded.

f. **A brand logo on the sign-in surface.** Whatever auth-screen the user sees (the `/login` page for server-side cookie gate, the modal/widget for auth-on-action, or the SDK-hosted widget for client-side) MUST render the demo's brand logo above the sign-in card. Use the pattern from `apps/remittance/components/ui/app-logo.tsx`:

```tsx
import { DynamicLogo } from "@dynamic-demos/ui";

// AppLogo: renders the brand's custom logo if present, else falls back to the Dynamic wordmark.
export function AppLogo({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {
  if (logoUrl) return <img src={logoUrl} alt="Logo" className={className} />;
  return <DynamicLogo wordmark className={className} />;
}
```

The logo source is the demo's brand record. For the silent-default brand (Step 2's "Brand handling"), `logoUrl` will be unset and the component renders `<DynamicLogo wordmark />` automatically. For custom-branded demos, the brand's `logoUrl` is passed through.

Naked sign-in surfaces — text-only headers, no logo — are a regression. The login page in PR #90's first generated demo (stripe-onramp) shipped naked; do not repeat that pattern.

#### Avoiding redirect loops

Two failure modes cause `ERR_TOO_MANY_REDIRECTS` on the `/login` page:

1. **`/login` not declared public.** `createDemoMiddleware` redirects every unauth'd request to `loginPath`. If `loginPath` itself isn't in `publicRoutes`, the middleware redirects the redirect → infinite loop.

   **Fix:** for the server-side cookie gate pattern, the middleware config MUST include `publicRoutes: ["/login"]` (plus any other paths that should bypass auth). Skip this and the demo's login page is an instant browser error.

2. **`/login` page auth-gates itself.** Components like `<DynamicAuthProvider>` or `<ConnectedAuthFlow>` configured to redirect unauth'd users will, when rendered on `/login`, redirect back to `/login`. Same loop, different layer.

   **Fix:** the `/login` page must be safe to render without a session. Use `<ConnectedAuthScreen>` (or the auth form primitives) directly — not the full-app auth-gate wrapper. Apps like `apps/remittance/components/login-page.tsx` and `apps/proceeds/app/login/page.tsx` are the canonical references.

Both checks are part of Step 9's verification: when you boot the generated app and visit `/login` in an incognito window, you should see the sign-in card on first paint with no redirects.

**Verification before continuing to Step 9**: open the generated `apps/<kebab>/` in your head and ask: "If a logged-out user lands on `/`, what happens? Can they sign in without a redirect loop? Does the sign-in surface render the brand logo? Once signed in, can they complete the flow without hitting a 401?" If any answer is "no" or "I don't know," go back and fix the wiring.

### Scaffolding a new package (Step 8.1 only)

When the user picked option (1) in Step 5, you create a new `packages/<provider>/` *before* the demo app, so the demo's code can import the new package the same way existing demos import `@dynamic-demos/iron` or `@dynamic-demos/blindpay`.

The package is **lightly opinionated**: it wraps the external service's API but does not hide its surface. It encapsulates auth / config and normalizes types and errors — nothing more. See `project_composition_architecture` memory for the rule.

Generation steps:

a. **Read the provider's docs.** Use the URL the user provides, or grep the existing registry / fixtures for known docs URLs (`provider.docs`, `provider.api_reference`). If you cannot find authoritative docs, stop and ask the user for the URL. Do not fabricate API shapes.

b. **Create the package skeleton** at `packages/<provider>/`:

```
packages/<provider>/
  package.json               # name "@dynamic-demos/<provider>", workspace deps
  tsconfig.json              # extends @dynamic-demos/tsconfig/base.json
  src/
    index.ts                 # public surface barrel
    client.ts                # thin auth + fetch wrapper around the provider API
    types.ts                 # request/response types reflecting the provider's docs
  AGENTS.md                  # per docs/templates/AGENTS.template.md
```

c. **`AGENTS.md` frontmatter** must include:

- `name: "@dynamic-demos/<provider>"`
- `kind: package`
- `flow_role: <whichever role the user's intent implies — onramp | offramp | bridge | wallet | etc.>`
- `custody: <non-custodial | custodial | mixed>` (read from docs)
- `status: experimental`
- `regions:` table (required for `onramp`/`offramp`)
- `provider:` block with `name`, `docs`, `api_reference`, `agent_docs` (or `none`), optional `status_page`, `changelog`

d. **Body of `AGENTS.md`** follows the template's order: provider docs reminder ("consult provider docs first"), supported regions table, capabilities list, public surface list, required environment variables, and (most importantly for the skill's downstream use) a "Dashboard API surface" section listing the endpoints you wired in step (e) below.

e. **Wire dashboard endpoints** under `apps/dashboard/src/app/api/<provider>/...` for the operations the demo needs. Each endpoint:
   - Requires `Authorization: Bearer <jwt>` + `x-dynamic-environment-id` header (D-004).
   - Reads server-side credentials from env (D-003 — never returned to the client).
   - Calls the new package's client.
   - Persists state transitions through `@dynamic-demos/transactions` where applicable.

f. **`.env.example`** in `packages/<provider>/` lists the sandbox env vars the package needs (D-005 — sandbox by default).

g. **Run `pnpm install`** to wire the workspace package into the dependency graph before the demo app generation (step 2) imports it.

The new demo app then imports the new package the same way `apps/proceeds` imports `@dynamic-demos/iron` — through the dashboard API, not direct package consumption from the app side.

## Step 9 — Verify before PR

Run inside the worktree:

```bash
pnpm install --frozen-lockfile
pnpm turbo typecheck
pnpm turbo lint
```

If either fails, fix the generated code and retry. Maximum 2 retries. If still failing after 2 retries, STOP and output:

```
I generated the demo but could not get it to typecheck after 2 fix attempts. Failing diagnostics:
<paste tsc / eslint output>
The branch <skill/...> has the partial state if you want to take it from here.
```

## Step 10 — Open the PR

```bash
git push -u origin skill/<kebab>-<timestamp>
gh pr create --title "feat(skill): <kebab> demo [demo-spec]" --body "<see below>"
```

PR body must include, in order:

1. The full resolved demo-spec JSON.
2. The composition plan from Step 7.
3. An `AGENTS.md` compliance checklist (regions present where required, provider docs linked, ≤200 lines).
4. Sandbox-by-default confirmation: "All credentials in `apps/<kebab>/.env.example` are sandbox values."
5. Reviewer notes section listing any decisions you had to make that the user didn't specify.

Never auto-merge. Always require human review (D-012).

## Failure mode responses

These are the exact response shapes for the 5 failure classes. Use these verbatim (substituting placeholders). Each response MUST include the literal phrases listed under "Required phrases" so the regression tests can assert on them.

### Class 1 — No provider matches corridor

Required phrases (case-insensitive): "no provider", the literal corridor name (e.g. "Antarctica").

```
No provider in the registry covers <corridor>.

Supported destinations:
<table of country/currency/rail from .claude/demo-registry.json, grouped by package>

Try one of the corridors above, or tell me a different demo idea.
```

Zero file changes. Stop.

### Class 2 — Named provider wrong region

Required phrases: the named provider (e.g. "BlindPay"), the unsupported region (e.g. "Mexico"), and at least one alternative provider id from the registry (e.g. "alfredPay").

```
<NamedProvider> doesn't cover <region>. Providers that do:

<list of alternatives from registry, with their flow_role and any constraints>
Example: alfredPay (offramp, BR/MX/CO/AR), Iron (offramp, US/EU/GB).

Want me to use one of those instead?
```

Zero file changes. Stop.

### Class 3 — Ambiguous corridor

Required phrases: "multiple" and a rail / corridor token (e.g. "PIX"). Output MUST contain exactly one question mark.

```
<corridor> has multiple providers in the registry that cover it (e.g. PIX in Brazil):

<list with 1-line description each>

Which do you want?
- Recommended: <one based on status=stable, custody match, region coverage>
```

Zero file changes. Wait for the user's pick. If they decline all, treat as class 1.

### Class 4 — Out of scope

Required phrase: "payment-flow demos".

```
This skill scaffolds payment-flow demos. I don't know how to build "<paraphrase of user request>".

Available demo kinds in this repo:
<list from registry: flow_role values>

If you want a payment-flow demo, describe the corridor and providers you have in mind.
```

Zero file changes. Stop.

### Class 5 — Missing piece

Required phrases: the named provider (e.g. "Stripe") and the literal string "full packages/". Output MUST end with the question "Which option do you want?" so the response carries exactly one question mark.

```
I don't have a package or known integration for "<provider>". Options:
1) Create a full packages/<provider>/ wrapper that surfaces this provider through the dashboard API (recommended — every future demo can use it). I'll read <provider>'s docs, generate a lightly-opinionated TypeScript client + types, wire dashboard endpoints under /api/<provider>/..., and write an AGENTS.md pointing at the external docs.
2) Wire <provider> directly in the demo app's code (fast escape hatch — use for genuine one-offs).
3) Abort.

Which option do you want?
```

Zero file changes. Wait for the user's pick.
