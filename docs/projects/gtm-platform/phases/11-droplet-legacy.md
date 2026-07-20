# Phase 11 - Legacy config forms -> droplet

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (decision 5), `../PLAN.md`. This phase may be dispatched as several parallel agents - one per route group - each producing its own PR. It trails v1: nothing blocks on it.

## Your role

Migrate the legacy per-kind operator config forms from the local UI kit to `@dynamic-labs-sdk/droplet` primitives via the shared shim (`src/components/droplet-client.ts`, Phase 07), so the whole operator surface reads as one product.

Route groups, one PR each (dispatch order by usage frequency): `wallets`, `remittance`, `trade`, `earns`, `checkouts`, `visa-direct`, `widgets`. `prospects` was rebuilt droplet-native in Phase 07 - skip it.

## Wave + dependencies

- Wave 5, after Phase 07 (shim + IA exist). Parallelizable per route group - different agents, different worktrees, zero file overlap (verify no shared component edits before dispatching in parallel; shared-component changes go in a preparatory PR first).

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-11-droplet-<group>`, branch `gtm/11-droplet-<group>`.
2. `frontend-design`, `web-design-guidelines` for the pass itself.
3. `verify` - drive each migrated form end-to-end (create/edit a config) before claiming done.
4. `superpowers:requesting-code-review`.

## Hard rules

- **Visual refactor only.** Zero behavior change: same fields, same validation, same actions called with the same payloads. If you find a bug mid-migration, file it in `../PROGRESS.md` notes - do not fix it in the migration PR.
- The action layer, mappers, and services are untouched. Diffs live in components/pages only.
- Droplet CSS ordering constraint holds (dashboard token blocks after droplet CSS in `src/globals.css`).
- Remove local-kit components only when their last consumer is migrated (final PR of the sequence does the sweep; earlier PRs leave them).
- spark26 untouched, as ever.

## Required reading before code changes

- Phase 07's new surfaces - the established droplet idiom for this codebase (form controls, tables, drawers, buttons).
- Your route group's existing form + its action calls (`lib/actions/<kind>.ts`) - the payload contract you must not disturb.
- `@dynamic-labs-sdk/droplet` component inventory (node_modules browse or its docs).

## What needs to happen (per route group)

1. Inventory the group's pages/components and their local-kit imports.
2. Rebuild each with droplet primitives through the shim; preserve field order, labels, help text, and validation messages verbatim unless they violate copy rules (then note the change in the PR).
3. Keep existing tests passing unmodified where they assert behavior; update only selectors/snapshots that assert markup.
4. Drive the form end-to-end locally (create + edit + delete a config of that kind) - evidence in PR.

## Acceptance criteria (per PR)

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] No diffs outside the route group's UI files (+ approved shared-component prep PR if needed).
- [ ] Action payloads byte-identical (assert via existing action tests remaining untouched and green).
- [ ] Before/after screenshots in PR.
- [ ] Final PR of the sequence removes now-unused local-kit components and updates AGENTS.md ("dashboard operator UI is droplet throughout").

## PR title

`refactor(dashboard): Phase GTM-11 - <group> forms to droplet`

## After merge

Update `../PROGRESS.md` (this phase's row tracks per-group checkboxes in its Notes cell).

## Out of scope

- Any behavior/validation change. New features on legacy forms. The `(public)` tree.
