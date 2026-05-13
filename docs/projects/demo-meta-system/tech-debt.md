# Tech Debt — Cross-App Audit Items

Tracked cleanup work that didn't fit into the originating PR's scope.
Each item lists the duplication today, the proposed consolidation, the
affected apps, and rough scope. Use this as the queue when picking up
"clean up the demo surface" work between feature phases.

---

## TD-004 — `createDemoMiddleware` should fail closed when `/login` is missing

**Status:** open.
**Surface area:** `packages/dynamic/src/demo-middleware.ts` (or wherever `createDemoMiddleware` lives), every app's `middleware.ts`.

### What's fragile today

`createDemoMiddleware` assumes a `/login` page exists in the app and silently redirects unauth'd traffic there. If the app doesn't ship `/login`, you get a redirect → 404 (or worse, a redirect loop) — no signal at build time or import time that anything's wrong.

The Phase 6A skill's first generated demo (`stripe-onramp`) hit exactly this: middleware was wired with `publicRoutes: ["/login"]`, but no `/login` page was generated. Unauth'd visitors landed on a broken state.

### Proposed fix

Make the `/login` requirement explicit in the middleware's contract:

```ts
createDemoMiddleware({
  demoType: "stripe-onramp",
  loginPath: "/login",   // default: redirect unauth'd traffic to this path
  // OR
  loginPath: false,      // explicit opt-out: no auth gate; auth-on-action pattern
});
```

- `loginPath: string` (default `"/login"`) → middleware redirects unauth'd traffic here.
- `loginPath: false` → middleware does not redirect; downstream code (API routes, components) enforces auth where needed. Use this for auth-on-action flows (onramp, checkout, public browsing).

**Also: when `loginPath` is a string, the middleware should auto-add it to `publicRoutes`** so callers can't accidentally create a redirect loop by listing `loginPath: "/login"` without also adding `"/login"` to `publicRoutes`. The current contract requires both — easy to forget, and the failure mode is `ERR_TOO_MANY_REDIRECTS` in the browser with no clear error in code. Hit by the Phase 6A skill's first end-to-end run.

Bonus: at build time (via a Next.js plugin, or a `next.config.ts` postbuild check), if `loginPath` is a string, verify the file `app/login/page.tsx` exists; throw with a clear error if not.

### Scope

- ~50 LOC in `packages/dynamic/`.
- Update existing app middlewares (remittance, earn, etc.) to use the new explicit `loginPath`. Most stay on default; auth-on-action apps switch to `false`.
- `packages/dynamic/AGENTS.md` documents the new option.
- Phase 6A skill's SKILL.md updates the "Auth wiring" table to reference `loginPath: false` where appropriate (already does — the option name will match after this PR lands).

### Why this is its own thing

The skill fix (PR #90) already instructs the generator to make the auth decision explicit. TD-004 closes the contract at the package layer so the issue can't recur in apps not authored by the skill.

---

## TD-003 — Manifest-driven codegen for dashboard demo-kind wiring

**Status:** open.
**Surface area:** `apps/dashboard/src/lib/services/{types.ts, demo-config-schemas.ts}`, `apps/dashboard/src/lib/types/dashboard.ts`, `apps/dashboard/src/components/sidebar.tsx`, and the per-kind union/nav entries every new demo type currently adds by hand.

### What's duplicated / fragile today

Every new demo type requires coordinated edits to three union files plus the sidebar:

1. `lib/services/types.ts` — append to `DemoConfigKind` string union.
2. `lib/services/demo-config-schemas.ts` — append to `DEMO_CONFIG_KINDS` array AND add a Zod member to the discriminated union.
3. `lib/types/dashboard.ts` — append `<Type>Config` and `Stored<Type>Config` interfaces.
4. `components/sidebar.tsx` — one-line nav entry.

The Phase 6A `create-demo-app` skill writes all four atomically, so drift can't happen at creation time. The risk shows up later — a human editing one union but forgetting another, a kind renamed in `types.ts` but stale in the Zod schema, an orphan section page after a sidebar entry is deleted. The unions are "secondary state" that should be derived, not edited.

### Proposed consolidation

Make each app's `AGENTS.md` frontmatter the single source of truth for "what demo kinds exist." Generate the union/nav glue from it at build time.

Pipeline:

```
apps/<kebab>/AGENTS.md       (frontmatter: kind, configSchema reference, sidebar metadata)
       ↓ codegen step
apps/dashboard/.generated/
  demo-config-kinds.ts        DEMO_CONFIG_KINDS + Zod discriminated union
  demo-config-types.ts        DemoConfigKind string union
  sidebar-entries.ts          Sidebar nav entries
```

The hand-edited files in `lib/services/types.ts`, `lib/services/demo-config-schemas.ts`, and `components/sidebar.tsx` stop being hand-edited — they import from `apps/dashboard/.generated/...`. The existing `scripts/generate-demo-registry.mjs` extends with an `--emit` mode that writes these `.generated/` files alongside the registry. CI `--check` gate fails any PR where regenerated output differs from the committed `.generated/` files (same pattern the registry already uses).

What stays per-type (intentionally — these encode demo-specific shape/behavior):

- `<Type>Config` / `Stored<Type>Config` interface bodies in `lib/types/dashboard.ts` — each kind's config shape is unique.
- Mapper at `lib/services/demo-config-mappers/<kind>.ts` — kind-specific round-tripping.
- Dashboard section pages under `app/<kind>/` — kind-specific editor UI.

Devs writing those still write code (which is the point — that's where intent lives). The boilerplate union/nav glue goes away.

### Scope

- Extend `scripts/generate-demo-registry.mjs` with `--emit` mode that writes the three `.generated/` files.
- Add `--check` to the relevant CI job so stale generated files fail PRs.
- Convert `lib/services/types.ts`, `lib/services/demo-config-schemas.ts`, `components/sidebar.tsx` to import from `.generated/` instead of hand-rolling.
- Backfill: regenerate against current `apps/*/AGENTS.md` frontmatter; commit the resulting `.generated/` files; confirm no behavioral diff.
- Update Phase 6A `create-demo-app` SKILL.md Step 8: remove the three union edits + sidebar edit from the file list; replace with "edit `apps/<kebab>/AGENTS.md` frontmatter to declare the kind, then `pnpm registry --emit`."

### Why this is its own thing

The Phase 6A skill works fine today because it writes all four edits in one atomic PR — drift at creation time is impossible. TD-003 closes the gap that opens *after* creation, when humans maintain demos and the four files can drift. Worth doing, but doesn't block 6A.

---

## TD-002 — Wire dashboard action layer through `DemoConfigService`

**Status:** done — PR [#83](https://github.com/dynamic-labs/demo-dashboard/pull/83).
**Surface area:** `apps/dashboard/src/lib/actions/{earns,wallets,trade,visa-direct,checkouts,remittance}.ts`.

### What landed
- All 6 demo-type action files now route through `services.demoConfigs.{create,get,list,update,delete}` via per-kind mappers in `apps/dashboard/src/lib/services/demo-config-mappers/`. `getRedis()` removed from every demo-type action.
- Shared `brand-resolver.ts` derives `brandId` via `scripts/backfill-brands/hash.ts` (deterministic on `(ownerId, primaryColor, logoUrl)`) — action-created and backfill-created rows converge on the same Brand row.
- `RedisDemoConfigService.get` falls back to the legacy per-kind keyspace on miss (read-only, no lazy upsert). The backfill constructs its service with `enableLegacyFallback: false` so its existence-probe stays honest.
- `CreateDemoConfigInput.name` is nullable end-to-end: blank form input → `null` in DB. Mappers surface `"Untitled <Kind> Config"` at the UI boundary so list rows stay readable.
- `USE_POSTGRES_DEMO_CONFIGS=false` default preserved. Redis remains canonical until ops flips it.
- New tests: brand-resolver determinism, per-mapper round-trips (every kind), legacy-fallback read path, nullable name (270 dashboard tests total, +31 vs baseline).

### Why it mattered
This was the gate between dormant infrastructure and an actual cutover. Path now: apply migration to staging Supabase → run `backfill:demo-configs` → flip `USE_POSTGRES_DEMO_CONFIGS=true` → soak → production.

---

## TD-001 — Consolidate auth flow into a shared `ConnectedAuthFlow`

**Status:** open.
**Surface area:** all server-side-auth demos (`remittance`, `earn`, +
any future demo using server-side cookie auth). The
client-side-auth demos (`wallet`, `shop`, `deposit`, `checkouts`,
`visa-direct`, etc.) auth inline via the Dynamic SDK widget and are
not affected.

### What's duplicated

`apps/remittance` and `apps/earn` each maintain their own copy of the
auth surface (~300–400 LOC per app):

| Surface | Remittance file | Earn file | Same shape? |
|---|---|---|---|
| Capability helpers (`isEmailAuthEnabled`, `getEnabledSocialProviders`, `isExternalAuthEnabled`) | `lib/dynamic/auth-{email,social,jwt}.ts` | `lib/dynamic-auth.ts` | yes — both read `client.projectSettings` |
| SDK thin wrappers (`sendEmailOTP`, `verifyOTP`, `signInWithExternalJwt`) | same | `lib/dynamic-auth.ts` | yes |
| Mutation hooks (`useSendEmailOTP`, `useVerifyOTP`, `useSocialAuth`, `useJwtAuth`) | `hooks/use-mutations.ts` (react-query) | `hooks/use-mutations.ts` (hand-rolled `useAsyncMutation`) | shape compatible (`mutateAsync` / `isPending` / `error`), implementations diverge |
| `AuthScreen` (wraps `LoginForm`) | `components/screens/auth-screen.tsx` | `components/screens/auth-screen.tsx` | yes |
| `OtpVerifyScreen` | `components/screens/otp-verify-screen.tsx` | `components/screens/otp-verify-screen.tsx` | yes (earn version uses Tailwind utilities directly; remittance uses `@dynamic-demos/ui` `WidgetCard` + `Button` + `Input`) |
| Screen state machine (auth ↔ otp-verify ↔ OAuth-completing) | `components/login-page.tsx` | `components/login-content.tsx` | yes |
| OAuth redirect completion | mutation-based (`useCompleteSocialAuth` returns a mutation) | effect-based (`hooks/use-complete-social-auth.ts` runs on mount) | divergent — should converge on one |

### What already exists in the shared package

`packages/dynamic/src/connected-auth-screen.tsx` defines
`ConnectedAuthScreen` accepting an `adapter` + navigation. Pattern is
correct; nobody uses it. The current per-app copies bypassed it
because the adapter interface didn't cover the full flow
(OAuth-completion path, cookie sync helper, mutation shape).

### Proposed consolidation

Move into `packages/dynamic`:

- Capability helpers (parameterised on `getClient: () => DynamicClient | null`).
- SDK wrappers (already SDK pass-throughs — no per-app coupling).
- A shared `useAsyncMutation` helper (or commit the workspace to
  react-query as a peer dep).
- `AuthScreen`, `OtpVerifyScreen`, and the screen state machine,
  parameterised on the adapter.
- A new top-level `ConnectedAuthFlow` component that bundles all of
  the above. Apps render `<ConnectedAuthFlow adapter={...}
  onLoginSuccess={...} />` and supply only the per-app glue.

### Adapter shape (proposed)

```ts
interface AuthFlowAdapter {
  getClient: () => DynamicClient | null;
  getAuthToken: () => Promise<string | null>;
  setAuthCookie: (token: string) => Promise<void>;
  // Optional: completeOAuthRedirect runs the redirect detection on mount
  // (extracted from each app's existing useCompleteSocialAuth).
}
```

### Estimated scope

- ~300 LOC moved into `packages/dynamic` (the bulk currently lives in
  each app's copy).
- ~250 LOC deleted across `apps/remittance` and `apps/earn` (each
  app's login surface collapses to ~10 lines).
- Net change: negative LOC, single source of truth.

### Apps to audit

- [x] `apps/remittance` — has duplicated copies, will migrate.
- [x] `apps/earn` — has duplicated copies, will migrate.
- [ ] `apps/trade` — has its own `createDemoMiddleware` server-auth
      gate; check whether it ships a custom login UI or already
      delegates somewhere shared.
- [ ] `apps/visa-direct` — has its own login screen with a custom
      `WidgetLayout` wrapper; check whether the auth panel is shared
      or duplicated.
- [ ] Future server-auth demos — should consume `ConnectedAuthFlow`
      from day one.

### Suggested PR title

`feat(dynamic): consolidate auth flow into shared ConnectedAuthFlow`

### Owner / phase

Phase 5 cleanup window (post Phase-4-app PRs landing). Not blocking
any in-flight work.

---

<!-- Add additional TD-NNN items below as they're spotted. Keep this
     doc as a flat list — newest at the top, oldest at the bottom — so
     the queue is grep-able and PR descriptions can link directly to
     a TD- id. -->
