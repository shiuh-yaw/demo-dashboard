# Phase 04 - Domain allowlist + two roles

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (Auth and roles), `../PLAN.md` (Shared contracts - auth helpers), and `docs/projects/demo-meta-system/DECISIONS.md` (D-004).

## Your role

Layer the GTM access model onto the dashboard's existing Dynamic OTP sign-in: allowlist by email domain, auto-create a `Profile` on first sign-in, and provide the server-side role helpers every later phase gates with. Sign-in mechanics do not change (D-004: dashboard keeps its own Dynamic env).

One logical PR.

## Wave + dependencies

- Wave 2, after Phase 03 (needs `services.profiles`). Blocks 05 and 07.

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-04-auth-roles`, branch `gtm/04-auth-roles`.
2. `superpowers:test-driven-development` - allowlist and role checks are security boundaries; tests first.
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- **Fail closed.** Unverifiable JWT, off-domain email, or missing profile -> no access. Empty `GTM_ALLOWED_DOMAINS` -> nobody passes (not everybody).
- Role enforcement is server-side in the helper, called by actions/route handlers - never only in layouts or client components.
- Domain matching is on the full domain after `@`, lowercased, exact match (no substring - `evil-fireblocks.com` must not pass for `fireblocks.com`).
- Do not touch the `(public)` route group.
- `.env.example` gains placeholder entries only.

## Required reading before code changes

- The `(operator)` layout's current auth gate: how the Dynamic session/JWT is verified today (`apps/dashboard/src/app/(operator)/`, and whatever session helper it calls - find it with `rg -l 'jwt|session' apps/dashboard/src/lib`).
- `apps/dashboard/src/lib/services/profiles.ts` (Phase 03).
- Existing env validation (`@t3-oss/env-nextjs` usage in the dashboard) for adding `GTM_ALLOWED_DOMAINS` / `GTM_OPERATOR_EMAILS`.

## What needs to happen

1. **`apps/dashboard/src/lib/auth/gtm.ts`** implementing the PLAN.md contract:
   - `getSessionProfile()`: resolve the verified Dynamic session email (reuse the existing verification - do not re-implement JWT logic); lowercase; check domain against `GTM_ALLOWED_DOMAINS`; on pass, `services.profiles.getOrCreateByEmail(email)`; on first creation, if email is in `GTM_OPERATOR_EMAILS`, `setRole(id, "operator")`. Returns null on any failure.
   - `requireProfile()`: `getSessionProfile()` or `redirect("/dashboard/denied")` (a simple droplet-styled "ask an operator for access" page you add).
   - `requireOperator()`: `requireProfile()` + role check; non-operators get the denied page (route context) or a thrown `ForbiddenError` (action context - follow how existing actions signal failure).
2. **Wire the `(operator)` layout** to `requireProfile()` so the allowlist applies to every operator URL. Existing operators whose emails are on the allowlisted domains keep working; anyone else now sees denied.
3. **Gate existing sensitive surfaces with `requireOperator()`**: the provider config actions and internal admin routes (`/api/internal/*`). Survey with `rg -l '"use server"' apps/dashboard/src/lib/actions` and gate each mutating action; demo-config CRUD stays available to both roles (SEs brand demos), provider-credential-ish and webhook surfaces are operator-only. Document the exact split you implement in AGENTS.md.
4. **Env**: add `GTM_ALLOWED_DOMAINS`, `GTM_OPERATOR_EMAILS` to env validation + `.env.example` placeholders.
5. **Tests**: domain matcher (exact match, case, subdomain and lookalike rejection, empty-allowlist fail-closed); getSessionProfile happy path + off-domain + no-session (mock the session helper); operator seeding on first sign-in only; requireOperator rejects `se` role on a sample gated action.

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] Every mutating action in `lib/actions` either calls `requireProfile()`/`requireOperator()` or is explicitly listed in the PR description as intentionally ungated (with reason).
- [ ] Lookalike-domain test passes.
- [ ] `/api/internal/*` routes are operator-gated.
- [ ] AGENTS.md documents the role split. `.env.example` updated with placeholders only. spark26 untouched.

## PR title

`feat(dashboard): Phase GTM-04 - domain allowlist + operator/se roles`

## After merge

Update `../PROGRESS.md`. Unblocks 05 and (with 01) 07.

## Out of scope

- New navigation/IA (07). Profile-editing UI (07). Invite flows (not in v1).
