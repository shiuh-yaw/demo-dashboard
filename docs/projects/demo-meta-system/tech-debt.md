# Tech Debt — Cross-App Audit Items

Tracked cleanup work that didn't fit into the originating PR's scope.
Each item lists the duplication today, the proposed consolidation, the
affected apps, and rough scope. Use this as the queue when picking up
"clean up the demo surface" work between feature phases.

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
