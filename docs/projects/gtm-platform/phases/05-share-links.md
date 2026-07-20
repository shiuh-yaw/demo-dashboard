# Phase 05 - Share links: mint, redirect, context endpoint

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (Share links), `../PLAN.md` (Shared contracts - endpoints, cookies, services).

## Your role

Ship the attribution spine: SEs mint per-prospect share links; `/s/[token]` lands prospects on a branded demo; a public context endpoint feeds the tracker the prospect name + book-a-call CTA. Includes a minimal "Share" action on the existing per-kind demo lists (the full Demos-table UI is Phase 07).

One logical PR.

## Wave + dependencies

- Wave 3, after Phases 03 (services) and 04 (`requireProfile`). Blocks 09. Parallel with 06.

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-05-share-links`, branch `gtm/05-share-links`.
2. `superpowers:test-driven-development`.
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- **Never a dead link.** Unknown/revoked/expired token -> 302 to the demo's plain launch URL; token that can't even identify a demo -> 302 to `/`. No 404s, no error pages on `/s/*`.
- `/s/[token]` lives in the `(public)` route group: no session calls, no Providers, server-only.
- The context endpoint returns only `prospectName` and `cta { label, url }` - never emails, ids, theme internals, or SE identity beyond the CTA label. 200 `{}` for anything invalid.
- CTA `url` must be https (validated at profile save in Phase 03; re-assert here before returning).
- Launch URLs come from the demo catalog (`src/lib/landing/demos.ts` `launchUrl` wiring) + the demo instance's theme param - reuse the existing link-generation helpers the dashboard already uses for its "open demo" buttons (`rg 'theme=' apps/dashboard/src` to find them). Do not invent a second URL builder.

## Required reading before code changes

- `apps/dashboard/src/lib/landing/demos.ts` and the existing demo-link generation (post `?id=` -> `?theme=` rename, PRs #74/#77/#80).
- `services.shareLinks` / `services.profiles` (Phase 03), `requireProfile` (Phase 04).
- How existing server actions in `lib/actions/` validate + return.

## What needs to happen

1. **Mint + revoke actions** (`lib/actions/share-links.ts`): `mintShareLink({ demoConfigId, prospectId })` -> `requireProfile()` -> `services.shareLinks.mint({ ..., profileId: profile.id })` -> returns `{ url: `${origin}/s/${token}` }`. `revokeShareLink(id)` -> owner or operator only.
2. **`/s/[token]/route.ts`** in `(public)`: `services.shareLinks.resolveByToken` -> build demo launch URL with `?share=<token>&theme=<prospectTheme>` -> 302. Fallbacks per hard rule 1. `export const dynamic = "force-dynamic"`.
3. **`GET /api/track/context/route.ts`**: public; CORS headers from `TRACK_CORS_ORIGINS` (+ `OPTIONS` handler); resolve token; respond `{ prospectName, cta: profile.schedulingUrl ? { label: "Book a call" + (profile.displayName ? ` with ${profile.displayName}` : ""), url } : null }`; `{}` otherwise. Cache-Control: no-store.
4. **Minimal share UI**: a "Copy share link" button on the existing per-kind config lists (each demo row) opening a small droplet-styled popover: pick prospect (existing prospect list), mint, copy URL. Keep it deliberately minimal - Phase 07 rebuilds the surface.
5. **Env**: `TRACK_CORS_ORIGINS` added to env validation + `.env.example` placeholder (shared with Phase 06 - coordinate: if 06 already merged it, reuse).
6. **Tests**: mint requires profile; revoke by non-owner non-operator rejected; `/s/` redirect for active token carries both query params; revoked token redirects plain; unknown token redirects `/`; context endpoint returns `{}` for revoked, full shape for active, never a 4xx/5xx for bad tokens; CORS headers present for allowlisted origin, absent otherwise.

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] `/s/[token]` has zero session/Provider imports (grep in review).
- [ ] Context endpoint response shape audited against the allowed-fields list above.
- [ ] An SE can mint + copy a link from the existing UI and the link opens a branded demo (manual verification with a local demo app noted in PR).
- [ ] AGENTS.md updated (new endpoints under "Public surface"). spark26 untouched.

## PR title

`feat(dashboard): Phase GTM-05 - share links, /s/[token], context endpoint`

## After merge

Update `../PROGRESS.md`. With 06, unblocks 09.

## Out of scope

- Ingest (06), Demos-table UI (07), link-level analytics (08).
