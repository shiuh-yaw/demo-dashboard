---
name: "@dynamic-demos/analytics"
kind: package
flow_role: utility
custody: n/a
status: experimental
---

# @dynamic-demos/analytics

Client tracker demo apps mount to report sessions, pageviews, steps, and milestone events to the dashboard's GTM ingest endpoint, plus a book-a-call CTA component. This package only speaks HTTP to endpoints the dashboard provides (`POST /api/track`, `GET /api/share/context`) - it has no database code and does not know how those endpoints are implemented.

## Capabilities

- `<GtmTracker demoSlug>` - mount-once provider: cookie/session bootstrap, initial + route-change pageviews, 15s visibility heartbeat, batching queue.
- `useTrack()` - `milestone(name, props?)` / `step(name)` for a demo's own funnel taxonomy.
- `<BookACallCta />` - floating CTA rendered only when the share context resolves one.
- Shared Zod wire schema (`trackEventSchema`, `trackBatchSchema`) - the single source of truth also imported by the dashboard ingest route (Phase 06).
- Fail-silent transport: batched POST with `keepalive`, `sendBeacon` drain on tab hide, retry-once-then-drop on failure.

## Public surface

- `GtmTracker` - provider component; mount once per app layout, wrapping the app tree. (stable)
- `useTrack` - hook returning `{ milestone, step }`; no-op outside a `<GtmTracker>` ancestor. (stable)
- `BookACallCta` - floating CTA component; renders nothing without a resolved `cta`. (stable)
- `trackEventSchema`, `trackBatchSchema` - Zod schemas, the wire contract. (stable)
- `TrackBatch` - inferred type of `trackBatchSchema`. (stable)
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
- `props` payloads are size-capped client-side at 2048 serialized characters. Oversized props are dropped with a `console.debug`, never an error.
- The wire schema (`schema.ts`) is copied verbatim from `docs/projects/gtm-platform/PLAN.md`'s "Shared contracts" section. If it must change, update PLAN.md in the same PR.
- Batching: flush at 20 events or 5s elapsed, whichever first. A failed flush retries once, then drops (no unbounded memory growth).
- Cookies are client-side (`document.cookie`), not `next/headers` - the tracker runs entirely in the browser.

## Integration map

**Imports:** none beyond `zod`, `react`, `next/navigation` (peer).
**Imported by:** demo apps mounting `<GtmTracker>` in their root layout (Phase 09 pilots `apps/wallet`); dashboard's ingest route imports `trackEventSchema` / `trackBatchSchema` (Phase 06).

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

## Do / Don't

- Do: mount exactly one `<GtmTracker>` per app, wrapping the whole tree, in the root layout.
- Do: call `useTrack()` from client components under the provider.
- Don't: import `queue.ts`, `cookies.ts`, or `context.ts` directly - they are internal.
- Don't: pass PII in `milestone`/`step` `props` - see DESIGN.md's enrichment PII guardrails.
- Don't: assume `useTrack()` throws when misconfigured - it is designed to silently no-op instead.

## Open questions / known gaps

- Session-replay sidecar and enrichment-provider pixel wiring are post-v1; `pixelSlot?: ReactNode` on `<GtmTracker>` is the reserved extension point, currently unused.
- No app is mounted against this package yet - `apps/wallet` pilot instrumentation lands in Phase 09.
- The ingest (`POST /api/track`) and context (`GET /api/share/context`) endpoints don't exist yet (Phases 06, 05) - this package is built and tested against the contract only, via a mock fetch.
