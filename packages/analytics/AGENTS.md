---
name: "@dynamic-demos/analytics"
kind: package
flow_role: utility
custody: n/a
status: experimental
---

# @dynamic-demos/analytics

Client tracker demo apps mount to report sessions, pageviews, steps/track events, milestones, and session-level identity to the dashboard's GTM ingest endpoint, plus a book-a-call CTA component. This package only speaks HTTP to endpoints the dashboard provides (`POST /api/events`, `GET /api/share/context`) - it has no database code and does not know how those endpoints are implemented.

## Capabilities

- `<GtmTracker demoSlug>` - mount-once provider: cookie/session bootstrap, initial + route-change pageviews, 15s visibility heartbeat, batching queue.
- `useTrack()` - `identify(userId, traits?)` / `track(name, props?)` / `page(name?, props?)` / `milestone(name, props?)`, matching common analytics libraries (Segment/Amplitude). `step` is kept as a deprecated alias for `track`.
- `useIdentify(user)` / `useAuthenticatedMilestone(user)` (deprecated alias) / `<AuthenticatedMilestone user={user} />` - fleet-wide identity bridge: given a Dynamic user (or null/undefined), resolves identity via `resolveUserIdentity` and fires BOTH `identify()` (session-level identity) AND the `authenticated` milestone (funnel back-compat) exactly once per mount, as soon as identity first resolves. Dynamic-agnostic - takes the already-resolved user as an argument; this package never imports a Dynamic SDK.
- `<BookACallCta />` - floating CTA rendered only when the share context resolves one.
- Shared Zod wire schema (`trackEventSchema`, `trackBatchSchema`, `identitySchema`) - the single source of truth also imported by the dashboard ingest route (Phase 06).
- Fail-silent transport: batched POST with `keepalive`, `sendBeacon` drain on tab hide, retry-once-then-drop on failure.

## Public surface

- `GtmTracker` - provider component; mount once per app layout, wrapping the app tree. (stable)
- `useTrack` - hook returning `{ identify, track, page, milestone, step }`; no-op outside a `<GtmTracker>` ancestor. (stable)
  - `track(name, props?)` - emits `type: "step"` (track and step are synonyms on the wire, preserving the existing funnel taxonomy). Prefer this over `step`.
  - `step(name, props?)` - **deprecated**, use `track`. Still emits `type: "step"`, unchanged behavior.
  - `page(name?, props?)` - manual pageview, emits `type: "pageview"`, in addition to the automatic pageview `<GtmTracker>` already emits on mount/route-change. `name`, when given, is folded into `props.name`.
  - `milestone(name, props?)` - unchanged, `type: "milestone"`. The funnel's authenticated/completed stages depend on this - do not change its wire shape.
  - `identify(userId, traits?)` - sets session-level identity (`{ userId, email?, traits? }` on the queue - last-wins, traits merged across calls) and enqueues one `type: "identify"` marker event with no props (`batch.identity` is the sole carrier of userId/email/traits - the event is never re-merged with them, which would bypass the props cap check). `email` is pulled from `traits.email` when it's a string of at most 320 chars (dropped otherwise, mirroring the server's `identitySchema` cap); the rest of `traits` passes through the same 2048-char size cap as `props`. Every batch from here on carries `identity`.
- `useIdentify(user: DynamicIdentityUser | null | undefined): void` - the going-forward name for the identity bridge. Fires `identify(dynamicUserId, email ? { email } : undefined)` and `milestone("authenticated", { dynamicUserId, email? })` exactly once per mount, as soon as `resolveUserIdentity(user)` first resolves non-null. Not deduped via `sessionStorage` across reloads (by design - see `identity.ts`'s doc comment); callers gate when they pass a non-null user (e.g. "wait until client-init finishes") to control exactly when the one-shot fire can happen. (stable)
- `useAuthenticatedMilestone` - **deprecated**, alias of `useIdentify` (same function reference). Kept so existing callers (`apps/wallet`, `apps/card`, ...) keep working unchanged; new callers should use `useIdentify`. (stable, deprecated)
- `AuthenticatedMilestone` - thin `<AuthenticatedMilestone user={user} />` component wrapper over the hook, for apps that prefer a mounted "analytics bridge" component (e.g. multi-page apps mounting once in the root layout) over calling the hook directly. Renders nothing. (stable)
- `BookACallCta` - floating CTA component; renders nothing without a resolved `cta`. (stable)
- `trackEventSchema`, `trackBatchSchema`, `identitySchema` - Zod schemas, the wire contract. `trackEventSchema`'s `type` enum is `["pageview", "step", "milestone", "identify"]`; `trackBatchSchema` carries an optional `identity` field (`{ userId, email?, traits? }`) - both additions are additive/optional, a batch without them still validates. (stable)
- `TrackBatch`, `TrackEvent`, `TrackIdentity` - inferred types of the schemas above. (stable)
- `resolveUserEmail`, `resolveUserIdentity` - pure, structurally-typed helpers that read the verified email / person-level identity (`{ dynamicUserId, email? }`) off a Dynamic user. Shared so email extraction is IDENTICAL across demos: top-level `user.email` first, then verified-credential fallbacks (`email` / `oauthEmails` / email-shaped `publicIdentifier`). No `@dynamic-labs-sdk` import - `SdkUser` structurally satisfies `DynamicIdentityUser`. (stable)
- `DynamicIdentityUser`, `UserIdentity` - the resolver's input/output types. (stable)
- `AuthenticatedMilestoneProps` - the component wrapper's prop type (`{ user: DynamicIdentityUser | null | undefined }`). (stable)
- Everything else in `src/` (`queue.ts`, `cookies.ts`, `context.ts`) is internal - do not import from outside this package.

## Required environment

- `NEXT_PUBLIC_TRACK_URL` - dashboard ingest base URL (e.g. `https://dashboard.example.com`) - optional; when unset, `<GtmTracker>` and `useTrack()` become total no-ops (no network calls, no throws).

## Slots vs invariants

**Slots:**

- `demoSlug` per app.
- `pixelSlot` - optional `ReactNode` extension point for a future enrichment pixel (post-v1, see "Open questions" below).
- CTA copy/url - comes entirely from the context endpoint response, not configured here.

**Invariants:**

- Fail-silent is the prime invariant. No public entry point (`GtmTracker`, `useTrack`, `BookACallCta`) may throw into the consuming app's render or interaction path, ever - not on bad env, not on network failure, not on a synchronously-throwing `fetch`.
- `props` payloads (and `identify`'s `traits`) are size-capped client-side at 2048 serialized characters. Oversized or non-serializable ones are dropped with a `console.debug`, never an error. `identify`'s `email` is capped client-side at 320 chars (dropped, not truncated, when longer) - matches the server's `identitySchema.email` limit so the guard isn't server-only.
- The `identify` wire event never carries `userId`/`email`/`traits` in its own `props` - `batch.identity` is the sole carrier. Re-merging them into the event would bypass the props cap (the merged object is never re-checked against it), risking a near-boundary payload sailing past 2048 and getting rejected server-side.
- Session identity is last-wins: a later `identify(userId, traits?)` call merges its traits over the previous ones rather than replacing them wholesale (`EventQueue.setIdentity`).
- The wire schema (`schema.ts`) is copied verbatim from `docs/projects/gtm-platform/PLAN.md`'s "Shared contracts" section. If it must change, update PLAN.md in the same PR.
- Batching: flush at 20 events or 5s elapsed, whichever first. A failed flush retries once, then drops (no unbounded memory growth).
- Cookies are client-side (`document.cookie`), not `next/headers` - the tracker runs entirely in the browser.

## Integration map

**Imports:** none beyond `zod`, `react`, `next/navigation` (peer).
**Imported by:** every demo app that mounts `GtmTracker` also mounts the shared `useAuthenticatedMilestone` (fleet-wide `authenticated` rollout, extracted from the wallet/card pilots): `apps/wallet` (`WalletApp`, fed `useAuthenticatedIdentity` reshaped to `DynamicIdentityUser`), `apps/card` (`CardIdentity`, fed the settled `useUser` result directly), `apps/deposit` (`DepositWidgetBody`, fed `hooks/use-authenticated-user.ts`), `apps/earn` (`<AuthenticatedMilestoneBridge />`, fed the existing `useDynamicUser()`), `apps/flow` (`<AuthenticatedMilestoneBridge />`, fed `hooks/use-authenticated-user.ts` - only verified-wallet scenarios populate a user), `apps/proceeds`/`apps/remittance`/`apps/trade`/`apps/visa-direct` (`<AuthenticatedMilestoneBridge />` per app, each fed its own `hooks/use-authenticated-user.ts`). `apps/checkouts`, `apps/cross-border-ap-ar`, and `apps/shop` do not mount `GtmTracker` at all yet - out of scope for this rollout. `apps/dashboard`'s public catalog landing (`<GtmTracker demoSlug="catalog">` in `(public)/layout.tsx`, `useTrack().step("demo_launch", { demo })` in `(public)/_components/tracked-launch-link.tsx` - feeds `services.analytics.catalogFunnel()`); dashboard's ingest route imports `trackEventSchema` / `trackBatchSchema` (Phase 06).

## Examples

```tsx
// apps/wallet/app/layout.tsx
import { GtmTracker } from "@dynamic-demos/analytics";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GtmTracker demoSlug="wallet">{children}</GtmTracker>
      </body>
    </html>
  );
}
```

```tsx
// Anywhere under <GtmTracker>
import { useTrack } from "@dynamic-demos/analytics";

function SendButton() {
  const { milestone } = useTrack();
  return (
    <button onClick={() => milestone("transfer_completed", { asset: "USDC" })}>
      Send
    </button>
  );
}
```

```tsx
// Anywhere under <GtmTracker>, once the user is known
import { useTrack } from "@dynamic-demos/analytics";

function Onboarding({ userId, email }: { userId: string; email?: string }) {
  const { identify, track } = useTrack();
  identify(userId, email ? { email, plan: "trial" } : { plan: "trial" });
  track("demo_launch", { demo: "wallet" });
  return null;
}
```

## Do / Don't

- Do: mount exactly one `<GtmTracker>` per app, wrapping the whole tree, in the root layout.
- Do: call `useTrack()` from client components under the provider.
- Do: prefer `track`/`useIdentify` over the deprecated `step`/`useAuthenticatedMilestone` aliases in new code - both pairs are otherwise identical.
- Don't: import `queue.ts`, `cookies.ts`, or `context.ts` directly - they are internal.
- Don't: pass PII in `milestone`/`track`/`page` `props` or `identify` `traits` beyond `email` - see DESIGN.md's enrichment PII guardrails.
- Don't: assume `useTrack()` throws when misconfigured - it is designed to silently no-op instead.

## Open questions / known gaps

- Session-replay sidecar and enrichment-provider pixel wiring are post-v1; `pixelSlot?: ReactNode` on `<GtmTracker>` is the reserved extension point, currently unused.
- `apps/wallet` is mounted against this package (Phase 09 pilot) - see its AGENTS.md "Analytics taxonomy" section for the milestone list. The `authenticated` milestone has since rolled out fleet-wide via `useAuthenticatedMilestone` (see "Integration map" above); other per-app milestone taxonomies (beyond `authenticated`) remain app-specific and are not all wired up yet.
- `apps/checkouts`, `apps/cross-border-ap-ar`, `apps/shop` don't mount `GtmTracker` at all - instrumenting them (pageviews/heartbeats + the `authenticated` milestone) is a follow-up, not covered by the fleet-wide `authenticated` rollout.
