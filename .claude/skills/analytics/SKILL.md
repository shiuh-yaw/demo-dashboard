---
name: analytics
description: Use when the user needs to instrument a demo app for GTM tracking - sessions, pageviews, step/milestone events, or the book-a-call CTA. Triggers on "gtm tracker", "track a milestone", "book a call cta", "GtmTracker", "useTrack", "@dynamic-demos/analytics", "instrument the demo for analytics". Fail-silent by construction - never throws into a demo's render or interaction path.
---

# Analytics (GTM tracker)

## Where to look first

1. **Local package:** `packages/analytics/` - read its `AGENTS.md` for the public surface.
2. **Design spec:** `docs/projects/gtm-platform/DESIGN.md` - the "Tracker" section explains why this exists (prospect share links, per-demo funnel analytics).
3. **Wire contract:** `docs/projects/gtm-platform/PLAN.md` "Shared contracts" - `trackEventSchema` / `trackBatchSchema` are binding; `packages/analytics/src/schema.ts` copies them.
4. **Dashboard endpoints this package talks to (built in later phases):** `POST /api/track` (ingest, Phase 06), `GET /api/track/context` (Phase 05). This package only speaks HTTP to them - it has no knowledge of how they're implemented.

## The client and its public surface

```tsx
import { GtmTracker, useTrack, BookACallCta } from "@dynamic-demos/analytics";

// Mount once, in the app's root layout, wrapping the whole tree.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GtmTracker demoSlug="wallet">
          {children}
          <BookACallCta />
        </GtmTracker>
      </body>
    </html>
  );
}

// Anywhere under <GtmTracker>, in a client component:
function SendButton() {
  const { milestone, step } = useTrack();
  return (
    <button onClick={() => milestone("transfer_completed", { asset: "USDC" })}>
      Send
    </button>
  );
}
```

- `GtmTracker` auto-tracks pageviews on route change and runs a 15s visibility heartbeat - demos don't call anything for that.
- `useTrack().milestone(name, props?)` is for a demo's own funnel taxonomy (e.g. `signed_in`, `transfer_completed`). Declare the taxonomy in the consuming app's `AGENTS.md`.
- `useTrack().step(name)` is for finer-grained UI steps, no props.
- `BookACallCta` renders nothing until the share-link context resolves a `cta` - most demos won't see it unless launched via a minted share link.

## Env vars

- `NEXT_PUBLIC_TRACK_URL` - dashboard ingest base URL. Required for the tracker to actually send anything; unset means total no-op (no throws, no network calls). Set per demo app, sandbox value only per D-005 until GTM rollout is approved for that app.

## Escape hatch - when the typed wrapper doesn't cover what you need

There is no escape hatch by design. `queue.ts`, `cookies.ts`, and `context.ts` are internal - don't import them from outside the package. If a demo needs an event shape the schema doesn't support, extend `trackEventSchema`/`trackBatchSchema` in `packages/analytics/src/schema.ts` and update `docs/projects/gtm-platform/PLAN.md`'s "Shared contracts" section in the same PR (Phase 06's ingest route imports this schema directly).

## Fail-silent is the whole point

Every public entry point (`GtmTracker`, `useTrack`, `BookACallCta`) wraps in try/catch. A thrown error inside the tracker must never propagate to the consuming demo - bad env, network failure, a synchronously-throwing `fetch`, blocked cookies, all degrade to "nothing happens," never a crash. Don't add a code path that could break this invariant; don't remove a try/catch "for cleanliness."

## Common gotchas

- `useTrack()` called outside a `<GtmTracker>` ancestor returns no-op functions - this is intentional, not a bug to "fix" by throwing.
- `props` passed to `milestone()` are capped at 2048 serialized characters; oversized props are dropped with a `console.debug`, never sent, never an error.
- The batching queue flushes at 20 events or 5s elapsed (whichever first) and retries a failed flush exactly once before dropping it - it never grows unbounded.
- On tab hide (`visibilitychange -> hidden`) the queue drains via `navigator.sendBeacon`, not `fetch` - there's no retry on that path, it's fire-and-forget by nature.
- Cookies (`dd_anon`, `dd_share`, `dd_internal`) are plain `document.cookie` reads/writes, not `next/headers` - the tracker is entirely client-side.
- This package doesn't mint or resolve share links, and doesn't implement the ingest/context endpoints - those are dashboard responsibilities (Phases 05/06). Don't add server code here.
