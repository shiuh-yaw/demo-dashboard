# Public Landing Page for Dynamic Demos — Design

**Date:** 2026-07-06
**Status:** Approved (brainstorm with etesenair)
**App:** `apps/dashboard`

## Goal

Replace the dashboard's auth-gated root page with a public, no-auth landing page that showcases Dynamic demo apps. This becomes the main public landing page for dynamic.xyz demos. The operator UI keeps working unchanged behind auth.

## Context / current state

- The root layout (`src/app/layout.tsx`) gates **every** route behind `isDashboardAuthenticated()` — unauthenticated visitors see a login form regardless of path.
- The current `/` page is an exact duplicate of `/brands` (both render `BrandsClient`), so replacing `/` loses nothing.
- The demo registry (`.claude/demo-registry.json`) lists 13 apps but records no deployment URLs; no URLs exist anywhere in the repo.
- Root metadata is stale ("Payment Widget").

## Decisions (from brainstorm)

1. **Demo URL source:** static, checked-in config file in the dashboard app. Cards with no URL render as "Coming soon".
2. **Demo scope:** stable demos only — `wallet`, `trade`, `earn`, `checkouts`, `remittance`, `proceeds`. No spark26, no experimental apps.
3. **Visual direction:** Dynamic brand, refined/professional (explicitly *not* youthful). Clean SDK-gallery aesthetic in the Stripe-samples / Vercel-templates family, `#4779FF` accent, light mode, DM Sans, desktop-first.
4. **Page scope:** hero + demo grid, operator sign-in link, footer with dynamic.xyz/docs/GitHub links, and per-demo detail pages at `/demos/[slug]`. No category filtering (only 6 demos).

## Architecture

Route-group split (idiomatic Next.js; alternatives — path conditionals in the root layout, or a separate landing app — rejected as fragile / overkill):

```
src/app/
  layout.tsx              # slimmed: fonts, Providers, globals.css, metadata → "Dynamic Demos"
  (public)/
    layout.tsx            # public chrome: header + footer, NO auth check
    page.tsx              # the landing page (moves here from src/app/page.tsx)
    demos/[slug]/page.tsx # statically generated detail pages
  (operator)/
    layout.tsx            # current auth + sidebar logic moves here verbatim
    brands/ remittance/ checkouts/ earns/ trade/ visa-direct/ wallets/ widgets/ documentation/
```

- All existing operator routes move under `(operator)/` — URLs unchanged (route groups don't affect paths), behavior unchanged.
- `src/app/page.tsx` (duplicate Brands page) is deleted; sidebar home link repoints `/` → `/brands`.
- "Operator sign in" in the public header links to `/brands`; the operator layout shows the existing login form when unauthenticated.
- `error.tsx` / `not-found.tsx` stay at root.
- API routes and `middleware.ts` untouched.

## Content model

`src/lib/landing/demos.ts` — typed array, one entry per demo:

```ts
interface LandingDemo {
  slug: string;          // unique, used for /demos/[slug]
  name: string;
  tagline: string;       // one-liner for the card
  description: string;   // longer copy for the detail page
  category: "wallet" | "checkout" | "offramp";  // from registry flow_role
  url?: string;          // live deployment; absent → "Coming soon"
  highlights: string[];  // feature bullets for the detail page
}
```

Six entries (wallet, trade, earn, checkouts, remittance, proceeds). Copy is derived from each app's AGENTS.md. URLs are left unset until domains land; the page ships regardless.

## Landing page layout

- **Header (sticky):** "Dynamic Demos" wordmark, links to dynamic.xyz and docs, discreet "Operator sign in" → `/brands`.
- **Hero:** concise headline + subcopy about exploring Dynamic-powered demo apps. No gimmicks.
- **Demo grid:** responsive card grid, 3 columns on desktop. Each card: category badge, demo name, tagline, per-category accent tint, "Launch demo" (external, disabled as "Coming soon" when no URL) and "Details" → `/demos/[slug]`.
- **Footer:** dynamic.xyz, docs, GitHub links.

## Detail pages

`/demos/[slug]`, statically generated via `generateStaticParams` from the config: name, category badge, full description, highlights list, launch CTA (or Coming soon), back link to `/`. Config can grow a `screenshot` field later without structural change.

## Error handling / edge cases

- Unknown slug → `notFound()`.
- Public layout performs no session lookups — no auth calls on the public path.
- Config with missing `url` degrades to "Coming soon", never a broken link.

## Testing

- Unit test for the demos config: unique slugs, non-empty name/tagline/description, `url` (when present) is a well-formed https URL.
- Repo gates: `pnpm turbo typecheck && lint && build && test`.
- Manual check: `/` renders without auth; `/brands` still gated; sidebar navigation intact.

## Out of scope

- Category filtering, screenshots, per-demo analytics, experimental/spark26 demos, dark mode for the public page, custom domain wiring.

## Security considerations

- No new secrets, env vars, or API surface. Public routes are static/config-driven and make no privileged calls.
- Auth boundary moves from root layout to the `(operator)` group layout — every existing operator route remains behind `isDashboardAuthenticated()`; verified by the manual check above.

## As-built addendum (2026-07-06, post-approval feedback rounds)

The implementation drifted from the approved decisions above during live review with the user. Trust the code over this spec where they differ. Summary of deltas:

- **Demo set:** Checkouts was replaced by **Flow** (`apps/flow`, experimental) — six demos: wallet, trade, earn, flow, remittance, proceeds.
- **Component layer:** cards/badges/buttons compose `@dynamic-labs-sdk/droplet@1.17.1` via a client re-export shim (droplet's dist is not RSC-safe). Illustrated gradient hero bands (flow's ScenarioCard idiom) with hand-drawn per-demo SVGs.
- **URLs wired:** dynamic.dev domains for wallet/trade/flow/remittance; earn + proceeds on vercel.app pending dynamic.dev domains.
- **Chrome:** no category badges; two-button CTA row (Launch + outline Details); header has Book a call + "Get a free account" CTA (no Docs); footer is "Made with ❤ by dynamic" (bold, slate-500) + Docs/GitHub(dynamic-labs-oss)/ToS/Privacy; **operator sign-in is the heart icon** (no explicit link).
- **Typography:** public tree set in Figtree (scoped; operator keeps Geist).
- **Dark-leak guard:** `force-light-theme.tsx` strips the `dark` class next-themes leaves on `<html>` after operator visits.
