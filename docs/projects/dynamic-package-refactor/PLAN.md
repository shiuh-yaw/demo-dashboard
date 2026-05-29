# `@dynamic-demos/dynamic` — refactor plan (parked)

> **Status: PARKED.** This plan is the audit + target-shape work-up from
> the May 2026 review of `packages/dynamic`. Execution is deferred until
> after the in-flight CI/Vercel work and `apps/flow` push finishes
> stabilising. Pick this up by re-reading the audit in §Current State,
> confirming nothing material has drifted, then choosing one of the
> §Execution Slices.

## Goal

Reframe `packages/dynamic` as the demo monorepo's **slim, opinionated
wrapper around the four Dynamic surfaces our apps care about**:

1. The **React hooks** (`@dynamic-labs-sdk/react-hooks`) — client-side
   wallet/auth state.
2. The **Dynamic backend API** — REST calls to read/write user
   metadata, fetch wallets, etc.
3. The **webhooks** — HMAC-signed lifecycle events apps subscribe to.
4. The **server auth chrome** — middleware, JWT, cookies, redirects.

Today the package does (4) well, partially covers (2) under a
misleading "metadata" label, and doesn't expose (1) or (3) at all.

## Current state (audited 2026-05)

Package size: **2,006 lines** across 18 source files, 14 exported
subpaths.

Consumers: **11 apps** depend on it (everything in `apps/` except
`spark26`).

### Audit findings by stack

| Stack | Files | What it does | Hooks can replace? |
|---|---|---|---|
| **Server auth chrome** | `createDemoMiddleware.ts` (364) · `auth-cookies.ts` (131) · `middleware.ts` (88) · `jwt.ts` (182) · `createConfigForwardingMiddleware.ts` (70) · `resolveCredentials.ts` (51) · `redirect.ts` (47) · `networks.ts` (62) | Edge-runtime middleware factories, JWT verification, httpOnly cookie sync, network config, credential resolution | **No** — runs in Edge, not React. |
| **Dynamic backend API** | `metadata.ts` (427) | Server-side REST client for Dynamic's `/users/{id}` and `/wallets` endpoints. Auth: `DYNAMIC_API_TOKEN`. Surfaces: `getUser`, `getUserWallets`, `updateUserMetadata`, KYC helpers, wallet-type helpers, deposit-Fireblocks helpers. | **No** — this is the dashboard-API client, orthogonal to client-side hooks. |
| **Client provider chrome** | `DynamicInit.tsx` (104) · `DynamicAuthProvider.tsx` (35) · `connected-auth-screen.tsx` (74) · `clientSingleton.ts` (156) · `use-auth-form.ts` (49) · `client.ts` (20) | React provider tree, SSR-safe singleton factory, small auth form hook | **Partially** — `useDynamicClient` overlaps with `clientSingleton.getClient()` for some callers; `DynamicInit` indirection rarely pulls its weight (always re-wrapped per-app). |

### Per-app usage

| Subpath / export | Apps consuming | Verdict |
|---|---|---|
| `/demo-middleware` | trade, remittance, earn, visa-direct, proceeds (5) | **Keep** — load-bearing |
| `/config-forwarder` | deposit, checkouts, wallet, shop (4) | **Keep** |
| `/auth-cookies` | trade, remittance, visa-direct, proceeds (4) | **Keep** |
| `/client-singleton` | deposit, checkouts, wallet, flow (4) | **Keep** |
| `/resolve-credentials` | deposit, checkouts, wallet, shop, flow (5) | **Keep** |
| Main: `getAuthenticatedUser*`, `getUserIdFromPayload` | trade, remittance, visa-direct, deposit, dashboard, earn, proceeds (7) | **Keep** — most-imported surface |
| Main: `getUser`, `updateUserMetadata`, `setKycCompleted`, `getWalletType` | trade, visa-direct, dashboard (3) | **Reframe** as `/api` (this IS the Dynamic backend API client; the "metadata" label hides what it is) |
| Main: `getDepositFireblocksEntry`, `mergeDepositFireblocksNetwork` | deposit only (1) | **Inline** into the app |
| Main: `AppAuthConfig` (type) | trade, remittance, earn, wallet, proceeds, visa-direct (6, type-only) | **Keep** |
| `/init` (`DynamicInit`) | trade, remittance, visa-direct, proceeds (4) | **Drop** — always renamed in each consumer's `dynamic-init.tsx` wrapper; the indirection isn't pulling weight |

### Gaps (what's missing today)

- **Hooks subpath** — apps that need `useUser` / `useWalletAccounts` /
  `useEvent` / `useWalletProviders` / `useInitStatus` reach into
  `@dynamic-labs-sdk/react-hooks` directly. Most notably,
  `apps/flow/lib/dynamic/flow-sdk.ts` wraps the imperative SDK calls
  (`isSignedIn`, `getPrimaryWalletAccount`, `onEvent`, `offEvent`)
  because the hooks aren't exposed through our package surface.
  `apps/flow/app/withdraw/components/platform-shell.tsx` rolls a
  bespoke 40-line rehydration block on top of those wrappers — which
  collapses to ~8 lines once `useUser` + `useWalletAccounts` +
  `useInitStatus` are available through `@dynamic-demos/dynamic`.

- **Webhooks subpath** — `apps/flow/lib/flow-helpers.ts` carries a
  string-template HMAC-SHA256 verifier `WEBHOOK_HANDLER_CODE`
  presented as a copy-paste reference snippet. It is exactly the
  function every webhook-receiving demo needs to import for real, but
  there is no shared module for it.

## Target shape

```
packages/dynamic/
  src/
    api/                   NEW — was metadata.ts (renamed + split)
      users.ts             getUser, updateUserMetadata, KYC helpers
      wallets.ts           getUserWallets
      client.ts            fetch wrapper + DYNAMIC_API_TOKEN auth header
      types.ts             DynamicUser, DynamicWallet, payload types
    auth/                  consolidated server chrome
      middleware.ts        createDemoMiddleware
      config-forwarder.ts
      cookies.ts           was auth-cookies.ts
      jwt.ts               JWT verify + DynamicJwtPayload
      resolve-credentials.ts
    client/
      singleton.ts         createDynamicClientSingleton (unchanged)
      hooks.ts             NEW — re-exports + adapters
      provider.tsx         DynamicAuthProvider (DynamicInit absorbed)
    webhooks/              NEW — lifted from apps/flow/lib/flow-helpers.ts
      verify.ts            verifyDynamicWebhook(rawBody, signature, secret)
      types.ts             CheckoutTransactionEventPayload, etc.
      handler.ts           optional Next.js POST helper
    networks.ts            unchanged
    redirect.ts            unchanged
    index.ts               barrel — carefully pruned
```

### New subpath exports

| Subpath | What it exposes |
|---|---|
| `@dynamic-demos/dynamic/api` | Dynamic backend REST client (was `metadata.ts`) |
| `@dynamic-demos/dynamic/api/users` | Fine-grained user mutations |
| `@dynamic-demos/dynamic/auth` | Server auth toolkit (middleware, JWT, cookies) |
| `@dynamic-demos/dynamic/middleware` | alias for `/auth/middleware` (back-compat) |
| `@dynamic-demos/dynamic/cookies` | alias for `/auth/cookies` (back-compat) |
| `@dynamic-demos/dynamic/client` | Client-side toolkit (provider, singleton) |
| `@dynamic-demos/dynamic/hooks` | Re-exports `@dynamic-labs-sdk/react-hooks` + adapters |
| `@dynamic-demos/dynamic/singleton` | Client singleton factory |
| `@dynamic-demos/dynamic/webhooks` | HMAC verifier + typed events |
| `@dynamic-demos/dynamic/networks` | unchanged |

### Drops

- **`DynamicInit` re-export**: 4 apps wrap it in their own
  `dynamic-init.tsx`. Drop the indirection; apps import
  `DynamicAuthProvider` directly.
- **Deposit-specific Fireblocks helpers**: 1 app, inline at the call
  site.
- **`use-auth-form.ts`**: audit; if 0-1 consumers, inline.

### What this unlocks downstream

| Today | After |
|---|---|
| `apps/flow/lib/dynamic/flow-sdk.ts` is 465 lines of imperative wrappers | Mostly deletable — apps import from `/hooks` |
| HMAC verifier is a copy-paste string snippet | `import { verifyDynamicWebhook } from "@dynamic-demos/dynamic/webhooks"` — the Webhooks tab on `apps/flow` shows the actual production import |
| Apps reach into `@dynamic-labs-sdk/client` for one-off helpers | Single workspace import surface |
| New app scaffold needs to learn 3-4 packages | Just `@dynamic-demos/dynamic` |

## Execution slices

Three sizes — pick by remaining bandwidth. Each slice is self-contained
and ends with gates green. Slice A is a strict subset of B which is a
strict subset of C.

### Slice A — Tactical (~1 PR, ~100 net lines)

The smallest payoff-bearing change. Adds the two missing subpaths, no
restructuring.

1. Add `@dynamic-labs-sdk/react-hooks` to `packages/dynamic`'s
   `peerDependencies` + add `react-hooks` to the catalog if not
   present.
2. Create `packages/dynamic/src/hooks.ts` that re-exports the upstream
   hooks (potentially with one or two thin adapter hooks like
   `useEmbeddedWalletAccount(chain)` that filters
   `useWalletAccounts()` to the platform anchor chain).
3. Add `/hooks` to `packages/dynamic/package.json` `exports`.
4. Create `packages/dynamic/src/webhooks/{verify,types}.ts` — port the
   HMAC verifier out of `apps/flow/lib/flow-helpers.ts`
   `WEBHOOK_HANDLER_CODE`. Add typed payload interfaces for the three
   `checkout.transaction.*.updated` axes.
5. Add `/webhooks` to `package.json` `exports`.
6. Refactor `apps/flow/app/withdraw/components/platform-shell.tsx`
   rehydration block (40 lines) to use `useUser` + `useWalletAccounts`
   + `useInitStatus` (~8 lines). Drop the `bootStartedRef` and the
   500ms `setTimeout` grace period.
7. Update `apps/flow/lib/flow-helpers.ts` `WEBHOOK_HANDLER_CODE` to
   import from `@dynamic-demos/dynamic/webhooks` instead of defining
   the verifier inline — the Helpers/Webhooks tab now demos the real
   production import.

Acceptance: typecheck + lint + tests green across the workspace,
`apps/flow` deploy succeeds on Vercel preview.

### Slice B — Strategic (Slice A + reframed `/api`, ~3 PRs)

Adds the API reframe on top of Slice A.

8. Create `packages/dynamic/src/api/{users,wallets,client,types}.ts`
   by carving `metadata.ts` apart along its natural seams.
9. Add `/api` and `/api/users` subpaths to `package.json` `exports`.
10. Update the 3 apps using metadata helpers (trade, visa-direct,
    dashboard) to import from the new subpaths.
11. Drop the deposit-specific Fireblocks helpers from `metadata.ts`
    and inline them into `apps/deposit/`.
12. Drop the `/init` subpath. Update the 4 consumers
    (trade, remittance, visa-direct, proceeds) to import
    `DynamicAuthProvider` directly from `/client`.

Acceptance: typecheck + lint + tests green; 5-6 apps have updated
imports; preview deploys for all updated apps succeed.

### Slice C — Architectural (Slice B + full restructure, ~5-8 PRs)

The complete target shape. Adds the source-tree reorganisation on top
of Slice B.

13. Move server auth files into `src/auth/` and update internal
    imports.
14. Move `clientSingleton.ts` to `src/client/singleton.ts`.
15. Merge `DynamicInit.tsx` and `DynamicAuthProvider.tsx` into
    `src/client/provider.tsx` (DynamicInit absorbed as
    implementation detail).
16. Audit `use-auth-form.ts` — inline if 0-1 consumers, otherwise move
    to `src/client/use-auth-form.ts`.
17. Add new `auth` + `client` barrel subpaths; keep flat
    `/middleware`, `/cookies`, `/singleton` etc. as back-compat
    aliases.
18. Update `packages/dynamic/AGENTS.md` to document the new layout.
19. Update each app's `AGENTS.md` gotchas section if any reference
    the old paths.

Acceptance: every app builds; every test passes; the package source
tree matches the §Target shape diagram exactly.

## Affected apps (rough order of touch surface)

| App | Slice A | Slice B | Slice C |
|---|---|---|---|
| `flow` | ✅ (platform-shell + webhooks snippet) | ✅ | ✅ |
| `trade` | — | ✅ (metadata imports) | ✅ (auth imports) |
| `visa-direct` | — | ✅ | ✅ |
| `dashboard` | — | ✅ | ✅ |
| `remittance` | — | — | ✅ (init drop) |
| `proceeds` | — | — | ✅ |
| `deposit` | — | ✅ (FB helpers inline) | ✅ |
| `earn` | — | — | ✅ |
| `wallet` | — | — | ✅ |
| `checkouts` | — | — | ✅ |
| `shop` | — | — | ✅ |
| `cross-border-ap-ar` | — | — | (audit) |
| `spark26` | — | — | — (zero-touch) |

## Open questions

- **Do we want a single `useDynamicClient` style hook in `/hooks`** that
  hands back the workspace singleton (combining
  `clientSingleton.getClient()` semantics with SDK's
  `useDynamicClient`)? If yes, that adapter lives in `hooks.ts` and
  is the canonical "give me the SDK client from anywhere in the
  component tree" path. Decide during Slice A planning.

- **Should webhook payload types live in this package OR generate from
  the upstream OpenAPI spec?** Today no upstream codegen exists in
  the repo. Hand-rolled types are fine for now; revisit if the demo
  team grows the webhook surface.

- **`/auth` barrel vs flat subpaths.** Flat (`/middleware`, `/cookies`)
  keeps current imports compatible; a `/auth` barrel is more
  discoverable. Probably ship both — `/auth` is the canonical
  documented surface, the flat ones are deprecation-tagged aliases.

## Why parked

- The `apps/flow` Phase A→D refactor just landed (~5 commits, large
  diff).
- CI/Vercel previews for the 7 unrelated apps are failing on a known
  JFROG_TOKEN env-config issue — bandwidth is going there.
- The audit shows current behaviour is correct; this work is pure
  ergonomics + correctness-by-construction (webhooks helper). Nothing
  here is a bug or blocker.

Resume signal: when there's a fresh PR window and the JFROG_TOKEN
situation is resolved, start with Slice A — it's a 1-PR, ~100-line
change that immediately repays the work via the `platform-shell.tsx`
simplification + the Webhooks demo tab pointing at a real import.
