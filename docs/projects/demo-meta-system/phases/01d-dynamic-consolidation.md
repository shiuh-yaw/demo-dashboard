# Phase 1D — Dynamic SDK consolidation

> **Self-contained agent prompt.** Read this entire file. Then read `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`.

---

## Your role

Promote duplicated Dynamic SDK setup across 8+ apps into `packages/dynamic`. Today every app reimplements: provider wrapper, init component, JWT cookie sync, network configuration. Skill scaffolding will be unbearable until this is one place.

This phase ships as **one logical PR** (or, if scope demands, two: package-side first, then per-app migrations).

## Wave + dependencies

- Wave 2.
- Sequence after Phase 1A, 1B, 1E to minimize merge conflicts (this phase touches many apps).
- Blocks Phase 4 (theme migration leverages the `createDemoMiddleware` factory).

## Skills to use

1. `superpowers:using-git-worktrees` — worktree at `.worktrees/phase-1d-dynamic`, branch `phase/01d-dynamic`.
2. `superpowers:writing-plans` — multi-step migration; write a plan with per-app todos.
3. `superpowers:test-driven-development` — write tests against the SDK source for the wrapper API.
4. `superpowers:subagent-driven-development` — per-app migrations are independent; consider dispatching sub-agents per app once the package surface is locked.
5. `superpowers:verification-before-completion`.
6. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch. AGENTS.md must explicitly note its self-contained Dynamic setup is preserved by exception.
- Read `packages/dynamic/` first; package exists, this phase extends it.
- **Reference the Dynamic SDK source authoritatively** (D-027). The team has access. Mirror the SDK's actual API surface, not docs reconstruction. If the SDK source isn't workspace-linked, set up a path-based dependency or document where the source lives so consumers know.
- Sandbox-by-default applies to JWT verification and network configuration.
- One commit per logical group; per-app migrations are separate commits.

## Required reading before code changes

- `packages/dynamic/src/index.ts` — current exports.
- `packages/dynamic/` — full directory.
- One reference app's Dynamic setup: `apps/remittance/app/providers.tsx`, `apps/remittance/app.config.ts`, `apps/remittance/components/dynamic-init.tsx`, `apps/remittance/lib/dynamic/`.
- Visa-direct's setup: `apps/visa-direct/app/providers.tsx`, `apps/visa-direct/middleware.ts`, `apps/visa-direct/lib/dynamic/`. **Visa-direct's middleware is the canonical pattern (D-008) for `createDemoMiddleware`.**
- Cross-reference 2-3 other apps to identify the actual common surface vs per-app variation: trade, wallet, earn, proceeds, deposit, checkouts, shop.
- Dynamic SDK source (the team has access — confirm path with stakeholder if not in workspace).
- `DECISIONS.md` D-003, D-004, D-008, D-027.

## What needs to happen

### 1. Audit existing `packages/dynamic` exports

List what's there today. Capture in your plan. Identify gaps against the duplication you find in apps.

### 2. Promote canonical primitives

Add to `packages/dynamic/src/`:

#### `createDemoMiddleware.ts`

Factory implementing the visa-direct cookie pattern (D-008). Signature:

```ts
export function createDemoMiddleware(opts: {
  demoType: string;             // drives cookie name + header name
  publicRoutes?: string[];      // e.g. ['/login']
  defaultReturnPath?: string;
  authCookieName?: string;      // default: 'dynamic_jwt'
}): MiddlewareFn;
```

Internals:
- Cookie name = `<demoType>_config_id`.
- Header forwarded to layout = `x-<demoType>-config-id`.
- Reads `?id=` query → sets cookie → forwards as header.
- Empty `?id=` → clears cookie.
- Auth-redirect: missing auth cookie + protected route → redirect to `LOGIN_PATH` with `returnTo`.
- Public routes pass through unauthenticated.

Reference visa-direct's `middleware.ts` line-by-line. Generalize the hardcoded values.

Tests in `__tests__/createDemoMiddleware.test.ts`: per-branch cases (query+cookie+header sync, auth redirect, public route, sessionExpired path).

#### `<DynamicAuthProvider>` HOC

Single reusable provider wrapper. Apps pass an `AppAuthConfig` (slot file `app.config.ts`); HOC handles the rest.

```ts
export function DynamicAuthProvider({ config, children }: {
  config: AppAuthConfig;
  children: React.ReactNode;
}) { ... }
```

`AppAuthConfig` shape (collect from existing `app.config.ts` files):
```ts
{
  environmentId: string;
  authMethods: { emailOtp?: boolean; socialProviders?: string[]; externalJwt?: boolean; passkey?: boolean };
  networks: NetworkConfig[];
  kycLevel?: 'none' | 'minimal' | 'full';
  defaultReturnPath?: string;
  branding?: { logoUrl?: string; appName?: string };
}
```

#### `<DynamicInit />`

Client-side init component (replaces per-app `dynamic-init.tsx`). Hooks into Dynamic context, kicks off initialization tasks.

#### Network factory

```ts
export function createNetworkConfig(opts: {
  chains: ('ethereum' | 'polygon' | 'base' | 'solana' | ...)[];
  testnet?: boolean;
}): DynamicNetwork[];
```

Replaces per-app `lib/dynamic/networks.ts`.

#### JWT cookie sync helpers

- `syncCookieRoute()` — Next.js route handler for `/api/auth/sync-cookie`.
- `clearAuthCookie(cookieStore)` — server action helper.
- `getAuthenticatedUserFromCookies(cookieStore)` — reads + verifies via Dynamic JWKS.

Verify against the SDK source's published JWT verification primitives — don't reimplement crypto.

#### `resolveCredentials()`

Implements the fallback chain:
1. App-specific `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` (if set).
2. Shared default `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT`.
3. Hard error at boot.

Same shape applies for Fireblocks credentials in `packages/fireblocks` (separate, but follow the same pattern).

### 3. Update `packages/dynamic/src/index.ts` to re-export

```ts
export { createDemoMiddleware } from './createDemoMiddleware';
export { DynamicAuthProvider } from './DynamicAuthProvider';
export { DynamicInit } from './DynamicInit';
export { createNetworkConfig } from './networks';
export { syncCookieRoute, clearAuthCookie, getAuthenticatedUserFromCookies } from './auth';
export { resolveCredentials } from './resolveCredentials';
export type { AppAuthConfig, NetworkConfig, DynamicEnvironmentContext } from './types';
// existing exports preserved
```

### 4. Migrate apps in this order

Migrate one at a time, one commit per app:

1. **`apps/remittance`** — closest to clean today. Validate the package surface against a real app first.
2. **`apps/visa-direct`** — refactor its custom middleware to consume `createDemoMiddleware`. The end state should be `~5 lines` of middleware.
3. **`apps/proceeds`** — consume.
4. **`apps/trade`** — consume.
5. **`apps/wallet`** — consume.
6. **`apps/earn`** — consume.
7. **`apps/deposit`** — consume.
8. **`apps/checkouts`** — consume.
9. **`apps/shop`** — consume.
10. **`apps/cross-border-ap-ar`** — consume.

Per app:
- Replace `app/providers.tsx` with `<DynamicAuthProvider config={appConfig}>`.
- Replace `components/dynamic-init.tsx` with `<DynamicInit />`.
- Replace `middleware.ts` with `createDemoMiddleware({ demoType: '<name>', ... })`.
- Replace `lib/dynamic/` directory contents with package imports.
- Trim `app.config.ts` to slot fields only.
- Run `pnpm typecheck` and `pnpm dev` per app to verify auth flow still works.

### 5. Spark26 exception

**Skip `apps/spark26/` entirely.** Do not refactor its Dynamic setup. Add a stub note to `apps/spark26/AGENTS.md` (Phase 3) saying:

> Spark26 uses local Dynamic helpers in `lib/dynamic/server.ts` and related files for production stability. Do not migrate to `@dynamic-demos/dynamic` without a separate planned project.

(If AGENTS.md doesn't exist yet, leave a `TODO` here for Phase 3.)

### 6. Document SDK source reference

In `packages/dynamic/AGENTS.md` (stub if Phase 3 hasn't run):

```yaml
provider:
  name: Dynamic SDK (first-party)
  docs: https://docs.dynamic.xyz
  api_reference: https://docs.dynamic.xyz/api-reference
  agent_docs: <to-be-published-in-Phase-8>
  source: <path-to-Dynamic-SDK-source>   # team has access; reference authoritatively
```

Add a body section explaining: "If you need a Dynamic primitive that this package doesn't expose, look in the SDK source first; consider whether to wrap it here or contribute to the SDK directly."

## Acceptance criteria

- [ ] `packages/dynamic` exports the canonical primitives (middleware factory, provider, init, network factory, cookie sync, credential resolver).
- [ ] All 10 listed apps consume the package; per-app `lib/dynamic/`, `dynamic-init.tsx`, `providers.tsx` boilerplate is removed.
- [ ] Each app's `app.config.ts` is reduced to slot fields.
- [ ] Visa-direct's middleware reduced to ~5 lines using `createDemoMiddleware`.
- [ ] Tests pass for the middleware factory's branches.
- [ ] **Spark26 untouched.**
- [ ] CI gates pass.
- [ ] Each migrated app boots in `pnpm dev` with auth flow working.

## Commit plan

1. `feat(dynamic): add createDemoMiddleware factory + tests`
2. `feat(dynamic): add DynamicAuthProvider + DynamicInit components`
3. `feat(dynamic): add network factory + cookie sync + credential resolver`
4. `refactor(remittance): consume @dynamic-demos/dynamic`
5. `refactor(visa-direct): consume createDemoMiddleware (canonical pattern)`
6. `refactor(proceeds): consume @dynamic-demos/dynamic`
7. `refactor(trade): consume @dynamic-demos/dynamic`
8. `refactor(wallet): consume @dynamic-demos/dynamic`
9. `refactor(earn): consume @dynamic-demos/dynamic`
10. `refactor(deposit): consume @dynamic-demos/dynamic`
11. `refactor(checkouts): consume @dynamic-demos/dynamic`
12. `refactor(shop): consume @dynamic-demos/dynamic`
13. `refactor(cross-border-ap-ar): consume @dynamic-demos/dynamic`

(If the PR gets too large to review, split: PR1 = package primitives, PR2 = per-app migrations. Acceptable.)

## PR title

`feat(dynamic): Phase 1D — consolidate SDK setup into @dynamic-demos/dynamic`

## PR description template

```
## Phase 1D of demo meta-system

Consolidates duplicated Dynamic SDK setup (providers, init, network config, JWT cookie sync, middleware) into `@dynamic-demos/dynamic`. Per-app boilerplate drops by ~200–500 lines per app.

### What changed
- `packages/dynamic` gains: `createDemoMiddleware` (visa-direct pattern), `<DynamicAuthProvider>`, `<DynamicInit>`, `createNetworkConfig`, JWT cookie helpers, `resolveCredentials` (fallback chain).
- 10 apps migrated. Each app's `app.config.ts` is now a thin slot file.
- Visa-direct middleware reduced to ~5 lines using the factory.

### Spark26
**Untouched.** AGENTS.md note explains the exception.

### Tests
- `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo build && pnpm turbo test` all pass.
- New Vitest suite for `createDemoMiddleware`.
- Manual `pnpm dev` smoke per app: auth flow works, theme cookie sticks, redirects function.

### References
- `DECISIONS.md` (D-003, D-004, D-008, D-027)
- Phase prompt: `docs/projects/demo-meta-system/phases/01d-dynamic-consolidation.md`
```

After merge, update `PROGRESS.md` row "1D. Dynamic SDK consolidation" to `🟢 done`.
