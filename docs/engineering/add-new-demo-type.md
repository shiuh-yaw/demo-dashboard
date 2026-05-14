# Adding a new demo type

This is the runbook for adding a new demo type (e.g. "wallet onramp," "remittance," "proceeds") when the `create-demo-app` skill's automation isn't enough — typically because the type needs a bespoke config model or dashboard section. Time budget: 4–8 hours for the scaffold; longer for the actual product surface.

> Decisions referenced: D-001 (dashboard orchestrator), D-002 (apps don't access Postgres), D-013 (Prisma + Supabase), D-014 (AGENTS.md required), D-018 (`pnpm setup:deploy`).

---

## Prerequisites

1. The demo type is new — not just a new instance of an existing type. If you're spinning up another offramp demo or another wallet demo, you don't need this runbook; clone the existing app and update branding/copy.
2. The Postgres schema needs a new `<DemoType>Config` model. (If the demo can reuse `BrandConfig` + an existing config table, skip ahead to step 5.)
3. You have read the `create-demo-app` skill at `.claude/skills/create-demo-app/SKILL.md` to understand the standard path — this runbook is the escape hatch for cases the skill can't handle.

## Steps

### 1. Add the Prisma model + migration

Edit `packages/db/prisma/schema.prisma`:

```prisma
model <DemoType>Config {
  id          String   @id @default(cuid())
  brandId     String
  brand       BrandConfig @relation(fields: [brandId], references: [id])
  // ...your fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("<demo_type>_configs")
}
```

Run the migration:

```bash
cd packages/db
pnpm prisma migrate dev --name add-<demo-type>-config
```

Enable RLS in the same migration (project convention — Prisma bypasses via superuser; this hardens against anon-key drift):

```sql
ALTER TABLE <demo_type>_configs ENABLE ROW LEVEL SECURITY;
```

### 2. Add the service layer

Create `apps/dashboard/src/lib/services/<demo-type>-config.ts`:

```ts
import { prisma } from '@/lib/prisma';

export const <demoType>ConfigService = {
  async get(id: string) { /* ... */ },
  async list(brandId: string) { /* ... */ },
  async create(brandId: string, input: <DemoType>ConfigInput) { /* ... */ },
  async update(id: string, input: Partial<<DemoType>ConfigInput>) { /* ... */ },
};
```

Mirror existing services (`brand-config.ts`, `earn-config.ts`). Tests go in `apps/dashboard/src/lib/services/__tests__/<demo-type>-config.test.ts`.

### 3. Add the dashboard section

Copy the existing dashboard section pattern (use `apps/dashboard/src/app/(dashboard)/earn/` as a reference). You need:

- A nav entry in `apps/dashboard/src/components/nav/sidebar.tsx`.
- A list + edit page under `apps/dashboard/src/app/(dashboard)/<demo-type>/`.
- API routes under `apps/dashboard/src/app/api/<demo-type>/` (GET list, POST create, PATCH update, DELETE).
- A form component using the existing `@dynamic-demos/ui` primitives — no new UI deps.

### 4. Scaffold the demo app

```bash
cd apps
cp -R earn <demo-type>  # closest existing app to the new type
```

Edit `apps/<demo-type>/`:

- `package.json` — `name: @dynamic-demos/<demo-type>`, bump version to `0.1.0`.
- `app.config.ts` — port (pick the next free port in the `4000`-range; check existing apps).
- `next.config.ts` — keep transpilePackages as in source.
- `.env.example` — only Dynamic + Fireblocks credentials at the app level (D-003). Provider creds live in dashboard.
- `AGENTS.md` — required (D-014); template at `docs/templates/AGENTS.template.md`.

Replace all references to the source demo's product surface (copy, branding hooks, demo-specific API calls).

### 5. Wire the demo app to the dashboard config

The demo app reads config via `GET /api/<demo-type>/config` (D-002 — apps never hit Postgres). Add this call at server-component fetch time:

```ts
// apps/<demo-type>/lib/dashboard-config.ts
export async function getDashboardConfig(brandId: string) {
  const res = await fetch(`${process.env.DASHBOARD_API_BASE_URL}/api/<demo-type>/config?brandId=${brandId}`);
  if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
  return res.json();
}
```

Transient state goes in Redis. User state goes in Dynamic metadata. No Postgres from the app side.

### 6. Update the registry

```bash
pnpm registry
```

The new app's `AGENTS.md` registers it for LLM discovery.

### 7. Provision Vercel

Follow `docs/engineering/deploy-new-demo.md`:

```bash
pnpm setup:deploy <demo-type>
```

### 8. Run the gates

```bash
pnpm turbo typecheck
pnpm turbo lint
pnpm turbo build
pnpm turbo test
```

## Failure handling

| Symptom | Cause | Fix |
|---|---|---|
| `prisma migrate dev` fails with "shadow database" error | Local Postgres not reachable | `pnpm --filter @dynamic-demos/db dev:db:up` |
| New nav entry doesn't render | Sidebar uses static import + tree-shaking | Restart `pnpm dev:dashboard` after editing sidebar |
| Demo app can't reach dashboard API | `DASHBOARD_API_BASE_URL` unset locally | Set to `http://localhost:4007` in `apps/<demo-type>/.env.local` |
| CI `[prod-creds]` guardrail trips | `.env.example` accidentally references `PRODUCTION` | Rewrite as sandbox-by-default per D-005 |

## Common gotchas

- **Don't extend the canonical state machine without filing a D-NNN.** New `TransactionState` values are a cross-cutting change — see `docs/engineering/extend-state-machine.md`.
- **Don't add a new UI primitive in the dashboard section.** Reuse `@dynamic-demos/ui`. If a primitive is genuinely missing, add it to the UI package first in a separate PR.
- **Don't skip AGENTS.md.** The `lint:agents-md` CI gate fails the PR if either the app or any new package is missing one.
- **Don't put provider secrets in `apps/<demo-type>/.env.example`.** Only Dynamic + Fireblocks creds (D-003). Everything else lives in `apps/dashboard/.env.example` and is fetched via the dashboard API.

## See also

- `.claude/skills/create-demo-app/SKILL.md` — the automated path (try first).
- `docs/engineering/deploy-new-demo.md` — Vercel provisioning.
- `docs/engineering/add-new-provider.md` — for adding the underlying provider package.
- `docs/projects/demo-meta-system/DECISIONS.md` — D-001, D-002, D-003, D-013, D-014.
