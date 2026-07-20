# Phase 07 - Dashboard IA relayout on droplet

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (Dashboard IA + decision 4/5), `../PLAN.md`. Reference the Coast layout the design mirrors: home = a demos table (prospect, template, creator, date, sessions, viewers, share, analytics), top nav Demos / Templates / Collections / Embeds / Settings - ours is Demos / Templates / Prospects / Analytics / Profile / Operations.

## Your role

Rebuild the operator surface's information architecture around the GTM workflow, entered at `/dashboard`, with the new surfaces droplet-native. Legacy per-kind config forms survive unchanged behind the new nav; their droplet migration is Phase 11.

One logical PR (large; commit per surface).

## Wave + dependencies

- Wave 4, after Phases 01 (Prospects), 03.5 (teams, prospect identity, `createdById`), and 04 (roles, `visibleProspectIds`). Blocks 08 and 11. Parallel with 09/10.

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-07-ia-relayout`, branch `gtm/07-ia-relayout`.
2. `frontend-design` + `tailwind-design-system` for the new surfaces; `dataviz` if any chart sneaks in (org chart belongs to Phase 08 - resist).
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- `(public)` route group untouched except one change: the footer heart link target becomes `/dashboard`.
- Operator URLs that exist today keep working: legacy per-kind routes remain mounted (under the new nav they group beneath Templates/Operations); `/brands` already redirects to `/prospects` (Phase 01) - re-point that redirect's target if you move prospects under `/dashboard/prospects`.
- New surfaces use `@dynamic-labs-sdk/droplet` via a client shim promoted to `apps/dashboard/src/components/droplet-client.ts` (move/extend the existing `(public)/_components/droplet-client.ts`; keep the public tree importing from the new location). Droplet's global CSS ordering constraint from AGENTS.md (dashboard token blocks stay after droplet CSS in `src/globals.css`) still holds - verify.
- `Operations` nav item and routes render only for `ADMIN`+ (`canAccessOperations`, Phase 04's `Role` enum - `OWNER`/`ADMIN`) AND every underlying action stays server-gated (Phase 04 helpers) - nav hiding is cosmetic.
- Sessions/viewers columns on the Demos table read from a `services.analytics.demoSummary` **stub you create** returning `{ sessions: 0, viewers: 0, avgDurationSec: 0 }` - Phase 08 replaces the internals; the call-site contract is fixed here.
- No em dash in copy; "onchain" is one word wherever it appears.

## Required reading before code changes

- `apps/dashboard/src/app/(operator)/` - current layout, sidebar, auth gate wiring (Phase 04's `requireUser` now lives in the layout).
- `apps/dashboard/src/app/(public)/_components/droplet-client.ts` - the shim pattern.
- `src/lib/landing/demos.ts` - the demo catalog feeding Templates.
- `services.demoConfigs` list surface - what a cross-kind "all demos" query looks like (single `DemoConfig` table with `kind` discriminator makes this one query).
- Phase 05's mint action + popover (reuse inside the Demos table's Share column).

## What needs to happen

1. **Route restructure** under `(operator)`:
   - `/dashboard` - Demos home: one table over all `DemoConfig` rows joined to Prospect + creator (creator = `User` where recorded, resolved via `resolveByDynamicIds`/`createdById` per Phase 03.5 - legacy rows without one show "-"). Lists are scoped via `visibleProspectIds(user)` (Phase 04; team-membership scoped, ADMIN+ unscoped). Columns: prospect (logo+name), template (kind), creator, created, sessions, viewers, share (mint popover from Phase 05), analytics (drawer trigger - renders "coming soon" empty state until Phase 08). Filters: kind, creator, prospect, date. Search by prospect name. Config forms select a prospect explicitly (or none) - no hash resolution (the hash-auto-create flow died in Phase 03.5B); a detach-config affordance clears a bound config's `prospectId`.
   - `/dashboard/templates` - card grid from the demo catalog (name, description, thumbnail/stack chips, "Create demo" -> links to the existing per-kind form route).
   - `/dashboard/prospects` (+ detail) - list scoped via `visibleProspectIds(user)`: logo, name, domain, linked demos count. Detail page is the account hub: identity header (name, domain, logoUrl, notes, status); tabs for Demos built-for + shown-to, Engagement, Share links, Theme (reads/writes `ProspectTheme`, Phase 03.5); archive-prospect affordance (flips `status` to `ARCHIVED`, does not delete); prospect creation flow pulls theme via the extract-theme action (Phase 03.5B's prospect-creation theme pull).
   - `/dashboard/profile` - edit displayName, avatarUrl, schedulingUrl (drives the book-a-call CTA; say so in the helper text).
   - `/dashboard/analytics` - shell page with empty state ("wire a demo to see engagement") - Phase 08 fills it.
   - `/dashboard/operations` - groups today's provider/webhook/docs/internal surfaces; operator-gated.
   - Root `(operator)` redirect: signed-in users hitting the old operator entry land on `/dashboard`.
2. **Navigation**: sidebar (or droplet top-nav if it fits droplet idiom better - your design call, document it): Demos, Templates, Prospects, Analytics, Profile, Operations(op-only).
3. **Legacy mounting**: per-kind routes (`/wallets`, `/earns`, ...) remain functional; add breadcrumb/back-links into the new IA. Do not restyle them (Phase 11).
4. **`DemoConfig.createdById`**: already added by Phase 03.5 (do not re-add or rename it) - this phase's job is to set it in the demo-config create actions and read it for the Creator column (via `resolveByDynamicIds`/`createdById`, falling back to "-" for legacy rows with neither).
5. **Tests**: Demos-table query service (cross-kind list with prospect join, filters); role-based nav rendering (operator vs se); profile update action validation; redirect tests (old entry -> `/dashboard`).

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] A `MEMBER`-role user sees Demos/Templates/Prospects/Analytics/Profile only; `ADMIN`/`OWNER` additionally Operations - verified by rendering tests, and underlying actions verified gated by Phase 04's tests.
- [ ] Every pre-existing operator URL still resolves (route inventory in PR description: old path -> new home).
- [ ] New surfaces import UI exclusively via the droplet shim (no new local-kit components on new pages).
- [ ] Public landing visually unchanged except the heart link target.
- [ ] AGENTS.md rewritten for the new IA in this PR. spark26 untouched.

## PR title

`feat(dashboard): Phase GTM-07 - GTM information architecture on droplet`

## After merge

Update `../PROGRESS.md`. Unblocks 08 and 11.

## Out of scope

- Real analytics numbers/drawer internals (08). Restyling legacy forms (11). Embeds/collections (post-v1).
