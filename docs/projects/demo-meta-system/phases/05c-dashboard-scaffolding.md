# Phase 5C — Dashboard scaffolding templates + demo-spec wiring + mock-data package

> **Self-contained agent prompt.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`, `docs/templates/demo-spec.schema.json`.

---

## Your role

Establish the dashboard's "new demo type" code template (so the skill can scaffold a new demo type's dashboard section consistently), wire `demo-spec.json` persistence into the dashboard's existing create flows, and consolidate scattered mock-data primitives into `packages/mock-data`.

Ships as **3 logical PRs**:
1. PR 5C-templates — code templates for new demo type sections at `docs/templates/dashboard-section/`.
2. PR 5C-demo-spec — wire demo-spec persistence into dashboard create/edit flows.
3. PR 5C-mock-data — consolidate per-app mock-data into `packages/mock-data`.

## Wave + dependencies

- Wave 4.
- Depends on Phase 2 (Postgres) — demo-spec records are persisted there.
- Depends on Phase 5A (webhook framework, since templates reference webhook patterns).

## Skills (every PR)

1. `superpowers:using-git-worktrees`.
2. `superpowers:writing-plans`.
3. `superpowers:test-driven-development`.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch.
- Templates are inert (`.tpl` extensions or in a non-source dir) so they don't participate in the build.
- Demo-spec versioning: `$schema_version: "1"` in every spec record (D-021).
- Mock-data consolidation must not break existing apps — apps continue to compose their own seeds from primitives.

---

## PR 5C-templates — Dashboard section templates

### What needs to happen

#### 1. Create `docs/templates/dashboard-section/`

Code skeleton mirroring `apps/dashboard/src/app/remittance/` (the highest-replicability pattern per Phase 0 audit).

```
docs/templates/dashboard-section/
  README.md                                 # how the skill consumes this template
  __DEMO_TYPE__/
    page.tsx.tpl
    new/
      page.tsx.tpl
    [id]/
      page.tsx.tpl
      __DEMO_TYPE__-config-editor.tsx.tpl
    components/
      __DEMO_TYPE__-client.tsx.tpl
  api/
    __DEMO_TYPE__/
      [id]/
        route.ts.tpl
  lib/
    actions/
      __DEMO_TYPE__.ts.tpl
    types/
      __DEMO_TYPE__.ts.tpl                  # appended to dashboard's types/dashboard.ts
  prisma/
    __DEMO_TYPE___migration.prisma.tpl      # appended to schema.prisma
```

Each `.tpl` file uses `__DEMO_TYPE__` as the literal placeholder for the demo type's name. Skill substitutes during scaffolding.

#### 2. Document the substitution rules

`docs/templates/dashboard-section/README.md`:

- `__DEMO_TYPE__` → kebab-case demo type name (e.g. `stablecoin-sandwich`).
- `__DemoType__` → PascalCase (e.g. `StablecoinSandwich`).
- `__demoType__` → camelCase (e.g. `stablecoinSandwich`).
- `__DEMO_TYPE_TITLE__` → human-friendly title (e.g. `Stablecoin Sandwich`).

Skill reads this README during scaffolding to know substitution rules.

#### 3. Document the post-scaffolding manual steps

Some integrations the skill can't fully automate:
- Adding the new model to `prisma/schema.prisma` and running migration.
- Adding the new section to dashboard's left nav (single line addition).
- Adding the new demo type to `.claude/demo-registry.md` (auto-generated, but the new app's `AGENTS.md` must exist first).

Document these in `docs/engineering/add-new-demo-type.md` so engineers reviewing the skill's PR know what to verify.

### Acceptance criteria (PR 5C-templates)

- [ ] Templates exist at `docs/templates/dashboard-section/` with `__DEMO_TYPE__` placeholders.
- [ ] Substitution rules documented.
- [ ] Templates are inert (not in build).
- [ ] Engineer runbook at `docs/engineering/add-new-demo-type.md`.
- [ ] CI gates pass.

---

## PR 5C-demo-spec — Demo-spec persistence

### What needs to happen

#### 1. Add `DemoSpec` model to Prisma

```prisma
model DemoSpec {
  id              String   @id @default(cuid())
  schemaVersion   String   @default("1")
  demoType        String
  demoInstanceId  String?  @unique  // nullable until linked
  spec            Json     // the demo-spec record
  ownerId         String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([demoType])
  @@index([ownerId])
}
```

#### 2. Persistence in existing create flows

Update `apps/dashboard/src/lib/actions/<demoType>.ts` for each demo type:
- On `create`, also create a `DemoSpec` record matching the new config. Spec body is derived from form input + defaults.
- On `update`, update the linked `DemoSpec` record.
- On `delete`, soft-delete the linked spec.

#### 3. Schema validation

Use `docs/templates/demo-spec.schema.json` as a JSON schema. Validate every spec write against it (use `ajv` or `zod-to-json-schema`/`json-schema-to-zod`). Reject invalid specs with 400.

#### 4. Migration: backfill specs for existing configs

Backfill script `scripts/backfill-demo-specs.ts`:
- For each existing config record (across remittance, earn, visa-direct, etc.), construct a `DemoSpec` record.
- Spec fields populated from current config + sensible defaults for fields the original creator didn't specify.
- Idempotent.

#### 5. Read/write helper

`apps/dashboard/src/lib/demo-spec.ts`:
- `getDemoSpec(demoType, demoInstanceId)`: returns the spec for a demo instance.
- `createDemoSpec(spec)`: persist a new spec.
- `updateDemoSpec(id, partial)`: partial update with version-aware merge.
- `migrateDemoSpec(spec)`: apply v1→v2 lazy migration when reading older specs (per D-021).

#### 6. Test coverage

- Spec creation, update, delete, read.
- Validation rejects invalid specs.
- Backfill idempotency.
- Lazy migration produces v-current spec from older versions.

### Acceptance criteria (PR 5C-demo-spec)

- [ ] `DemoSpec` model + migration.
- [ ] All demo type create/update/delete flows persist specs.
- [ ] Schema validation enforces shape.
- [ ] Backfill script with tests.
- [ ] Lazy migration helper.
- [ ] CI gates pass.

---

## PR 5C-mock-data — `packages/mock-data`

### What needs to happen

#### 1. Scaffold `packages/mock-data`

```
packages/mock-data/
  src/
    index.ts
    users.ts          # mock host, customer, admin profiles
    transactions.ts   # mock transaction records
    kyc.ts            # mock KYC profiles
    addresses.ts      # mock wallet addresses, banking details
    factories.ts      # factory helpers (createMockUser, etc.)
    __tests__/
      factories.test.ts
  AGENTS.md           # stub if Phase 3 hasn't run
  package.json
  tsconfig.json
```

#### 2. Identify shared primitives

Audit `apps/*/lib/mock-data.ts` files. Identify common shapes:
- User profile (name, email, joined date).
- Transaction (id, amount, currency, status, dates).
- Bank account (mask, type).
- Wallet address (chain, address mask).
- KYC profile.

Promote shared shapes to `packages/mock-data`. Keep app-specific seed data (specific dollar amounts, demo personas, copy strings) **local** to each app — those are presentation, not primitives.

#### 3. Migrate apps to compose

Per app, replace duplicated primitive definitions with imports from `@dynamic-demos/mock-data`. App's own seed file composes:

```ts
// apps/visa-direct/lib/mock-data.ts
import { createMockUser, createMockTransaction } from '@dynamic-demos/mock-data';

export const MOCK_HOST = createMockUser({
  name: "Sarah Chen",
  hostSince: "2019",
});

export const MOCK_TRANSACTIONS = [
  createMockTransaction({ ... }),
  createMockTransaction({ ... }),
];
```

Spark26 excluded.

#### 4. AGENTS.md stub for the new package

Phase 3 fills it in.

### Acceptance criteria (PR 5C-mock-data)

- [ ] `packages/mock-data` exists with primitives + factories.
- [ ] Each migrated app composes seeds from package primitives + local presentation data.
- [ ] No app's UI behavior changes (mock data values preserved).
- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.

---

## Common acceptance criteria

- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.
- [ ] DECISIONS.md references included where relevant.

## PR titles

- `feat(scripts): Phase 5C — dashboard section templates for new demo types`
- `feat(dashboard): Phase 5C — demo-spec persistence + validation + backfill`
- `feat(mock-data): Phase 5C — consolidate shared mock primitives`

After each PR merges, update `PROGRESS.md` row "5C. Dashboard scaffolding templates + mock-data" — track sub-status if useful.
