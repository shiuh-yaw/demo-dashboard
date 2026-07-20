# GTM Platform - Locked Decisions

Source of truth for architectural and process decisions made during the GTM
platform effort. Phase prompts reference these by short label. Update only
with a new dated row + rationale; never silently mutate.

This file is scoped to the GTM platform project (`docs/projects/gtm-platform/`).
It does not renumber or supersede `docs/projects/demo-meta-system/DECISIONS.md`.

---

## GTM-D-001 - Prospect subsumes Brand - one record carries identity + theme

Phase 01 renamed the `Brand` Prisma model (and every FK, service, action,
mapper, backfill script, and dashboard route that referenced it) to
`Prospect`, and added two nullable identity columns: `domain` and `notes`.
There is no separate sibling record for prospect identity - the existing
theme/logo row is extended in place.

Why:

- A prospect is a company we sell to. Its visual theme (primary color,
  logo, border radius, etc.) is one facet of that identity, not the whole
  record. Splitting identity into a second table would require joining
  it back to theme on every read that already needs both (share links,
  analytics, the demo-config theme resolution path) for no isolation
  benefit - the two facets are always read and written together today.
- Matches the operator mental model already established by D-028
  (`docs/projects/demo-meta-system/DECISIONS.md`): "create a brand/prospect
  X, spin up demos using it." Adding `domain`/`notes` to the same row keeps
  that flow first-class instead of introducing a second lookup.
- The rename is mechanical and behavior-preserving: the deterministic
  backfill hash `(ownerId, primaryColor, logoUrl)` is untouched (same
  inputs, same `bf_<24-hex>` ids), the Postgres migration is a hand-written
  `ALTER TABLE ... RENAME` (never drop-and-recreate - production rows
  exist), and RLS state carries over automatically since rename operates
  on the same table OID.
- `/brands` (UI) and `/api/brands/:path*` 308-redirect to their `/prospects`
  equivalents so existing operator bookmarks and any out-of-repo caller
  keep working.

See `docs/projects/gtm-platform/DESIGN.md` decision 3 and
`docs/projects/gtm-platform/phases/01-prospect-rename.md` for the full
rename scope.
