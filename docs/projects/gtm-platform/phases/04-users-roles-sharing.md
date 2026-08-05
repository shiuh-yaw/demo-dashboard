# Phase 04 - Users, roles, workspace sharing

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (Auth and roles + decision GTM-D-002), `../PLAN.md` (Shared contracts - auth helpers, User model, Role enum), and `docs/projects/demo-meta-system/DECISIONS.md` (D-004).

## Your role

Turn the dashboard's single-operator model into real user management: allowlisted sign-in auto-creates a `User` row (Phase 03, amended: model `User`, `dynamicUserId`, `Role` enum), roles gate mutations and the admin surface, and visibility is **progressive** (amended 2026-07-21) - a scoped user sees only records they own plus records of teams they belong to (mine-only with zero memberships); ADMIN/OWNER unscoped.

One logical PR.

## Wave + dependencies

- After Phase 03 (#151) AND Phase 03.5 PR A (needs `services.users`, `services.teams`, and `claimLegacyRecords`). Blocks 05 and 07.

## Decision context (GTM-D-002, locked 2026-07-20)

- `User` is the single internal-person entity: email (unique, from Dynamic OTP), `dynamicUserId` (JWT `sub`, unique, write-once), displayName, avatarUrl, schedulingUrl, `role Role @default(MEMBER)`.
- `Role` is a Prisma enum - industry-standard names, no homegrown terms: `OWNER | ADMIN | MEMBER | VIEWER`.
  - OWNER: everything, incl. assigning/revoking any role; only an OWNER may change an OWNER. Seeded from `GTM_OWNER_EMAILS`.
  - ADMIN: mutate any record (incl. legacy orphans), operations surface (providers/webhooks/internal), assign roles below ADMIN. Seeded from `GTM_ADMIN_EMAILS`.
  - MEMBER: default on first sign-in. Create records, mutate own records (ownerId === their dynamicUserId), mint share links, edit own user profile.
  - VIEWER: read-only everywhere; no minting, no mutations.
- Existing `ownerId` values on Prospect/DemoConfig ARE Dynamic subs - they join to `User.dynamicUserId`. Never rewrite stored ownerId values; `createdById` FKs (Phase 03.5) are the real linkage. Records with no resolvable creator show "-" (legacy rows).
- Visibility (GTM-D-003, amended 2026-07-21): PROGRESSIVE. A scoped user sees records they own (`createdById === user.id`, `ownerId === user.dynamicUserId` fallback) plus prospects/demos of teams they belong to; ADMIN/OWNER see everything. Teams are optional and explicit-only (no seeded default team, no auto-join), so with zero memberships this is mine-only. `Prospect.teamId` is nullable with no default. Ownership = attribution + a visibility scope + mutation guard.

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-04-users`, branch `gtm/04-users-roles`.
2. `superpowers:test-driven-development` - allowlist, role checks, and the visibility flip are security boundaries; tests first.
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- **Fail closed.** Unverifiable JWT, off-domain email, missing user -> no access. An empty `ALLOWED_EMAIL_DOMAINS` -> nobody passes.
- Domain matching: full domain after `@`, lowercased, exact match (`evil-fireblocks.com` must not pass for `fireblocks.com`).
- Role + creator enforcement is server-side in every mutating action - never only in UI.
- Role checks compare enum values, never strings scattered through call sites - one policy module (`can.ts` or similar) owns the matrix.
- Legacy orphan rows (ownerId empty): ADMIN+ mutate only.
- Do not touch the `(public)` route group. `.env.example` placeholders only.
- Never use em dash - use "-".

## Required reading before code changes

- The `(operator)` layout's current auth gate + session helper (find via `rg -l 'jwt|session' apps/dashboard/src/lib`). `user.sub` is the Dynamic sub used as ownerId everywhere.
- `apps/dashboard/src/lib/services/users.ts` (Phase 03 post-amendment) - `getOrCreateByEmail`, `setRole`, `resolveByDynamicIds`.
- Every `lib/actions/*.ts` ownership check: `rg -n 'ownerId' apps/dashboard/src/lib/actions` - checkouts, earns, remittance, trade, visa-direct, wallets, prospects all filter lists by `ownerId === user.sub` and guard edits the same way.
- Env validation (`src/env.ts`).

## What needs to happen

1. **Policy module** `apps/dashboard/src/lib/auth/policy.ts`: pure functions over the `Role` enum -
   - `canMutateRecord(user, record)`: ADMIN/OWNER always; MEMBER when `record.ownerId === user.dynamicUserId`; VIEWER never; orphan rows ADMIN+ only.
   - `canMintShareLinks(user)`: MEMBER+.
   - `canAccessOperations(user)`: ADMIN+.
   - `canSetRole(actor, targetCurrentRole, newRole)`: OWNER -> any; ADMIN -> only when both `targetCurrentRole` and `newRole` are MEMBER or VIEWER; others never.
2. **`apps/dashboard/src/lib/auth/gtm.ts`** per PLAN.md contract:
   - `getSessionUser()`: verified Dynamic session (email + sub) -> lowercase email -> `ALLOWED_EMAIL_DOMAINS` exact-match check -> `services.users.getOrCreateByEmail(email)` -> persist `dynamicUserId = sub` if unset (write-once; log + keep original on mismatch, never overwrite) -> on first sub capture, fire `services.users.claimLegacyRecords(user)` (one-shot legacy createdById reconciliation, Phase 03.5). No team auto-join (membership is explicit-only). Deactivated users (`deactivatedAt` set) are rejected like off-domain. Null on any failure.
   - `requireUser()` / `requireAdmin()`: as contracted; denied page at `/dashboard/denied`.
3. **Wire the `(operator)` layout** to `requireUser()`.
4. **Visibility flip**: one `visibleProspectIds(user)` helper (team-membership join; ADMIN+ -> unscoped) used by every list action. Demo-type actions + prospects action drop the `ownerId === user.sub` filter and scope by the helper instead (unbound demos - null prospectId - are workspace-visible). Edit/delete guards become `canMutateRecord`. Create paths: VIEWER rejected; others stamp `createdById` + `ownerId = user.sub` per Phase 03.5's dual-write rule. Route all actions through the shared policy helpers, not per-file logic.
5. **`setRole` action** (`lib/actions/users.ts`): guarded by `canSetRole`; no UI yet (Phase 07) - server action + tests only.
6. **Access list**: `ALLOWED_EMAIL_DOMAINS` in `lib/auth/gtm.ts`, in code rather than env. GTM auth reads no env var.
7. **Tests**: domain matcher (exact/case/lookalike/empty fail-closed); getSessionUser happy/off-domain/no-session + dynamicUserId capture + sub-mismatch logging; default role MEMBER on creation (roles are never seeded); full `policy.ts` matrix (all four roles x own/other/orphan records, minting, operations, setRole combinations incl. ADMIN attempting to touch ADMIN/OWNER -> rejected); per-action: list returns other-owners' rows, VIEWER mutation rejected, MEMBER edits own but not other's, ADMIN edits anything incl. orphans.
8. **Docs**: AGENTS.md (roles, sharing model, policy module).

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] `Role` is a Prisma enum (`OWNER ADMIN MEMBER VIEWER`), default MEMBER; no bare role strings outside the enum and policy module.
- [ ] Workspace-shared lists proven by tests; full policy matrix tested; VIEWER cannot mutate or mint anywhere.
- [ ] Every mutating action routes through `requireUser` + policy helpers or is listed in the PR description as intentionally ungated (with reason).
- [ ] Lookalike-domain test passes; empty allowlist fails closed; `dynamicUserId` write-once respected; ownerId values never rewritten.
- [ ] AGENTS.md updated. spark26 untouched. `/api/internal/*` gated ADMIN+.

## PR title

`feat(dashboard): Phase GTM-04 - users, role enum, workspace sharing`

## After merge

Update `../PROGRESS.md`. Unblocks 05 and (with 01) 07.

## Out of scope

- Per-prospect ACLs (progressive own + team visibility is locked). Invite flows. Team-assignment UI. Role-management UI and profile-editing UI (07). Nav/IA changes (07). The Demos table itself (07).
