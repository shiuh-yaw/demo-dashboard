# Adding a new webhook receiver

This is the runbook for wiring a new provider's webhook deliveries into the dashboard via the Phase 5A framework. Time budget: ~1 hour for a provider whose package already exports `verifySignature` + `normalize`.

> Decisions referenced: D-011 (webhooks land at dashboard only, per-provider routes), D-010 (state transitions go through `assertValidTransition`), D-005 (sandbox by default).

---

## Prerequisites

1. The provider's package (`packages/<provider>/`) already exports `verifySignature` + `normalize` from `src/webhooks.ts`. If not, ship that first as a separate PR — it's a Phase 1B task, not Phase 5A.
2. The provider's `state-mapping.ts` returns canonical `TransactionState` values for status fields. The webhook framework uses this to decide the next state transition.
3. The provider has a sandbox webhook subscription you can configure to point at a preview URL or local tunnel.

## Steps

### 1. Add the webhook secret to env

In `apps/dashboard/src/env.ts`:

```ts
<PROVIDER>_WEBHOOK_SECRET: z.string().optional(),
```

…and the matching entry in `runtimeEnv`. Receivers fail closed (return 401) when the secret is unset, so optional is correct — production deployments populate it via Vercel env, local dev uses `.env.local`.

### 2. Write the per-provider adapter

Per-provider quirks (header naming, status mapping defensiveness) belong in `apps/dashboard/src/lib/webhooks/<provider>-adapter.ts`. The adapter exports two functions matching the framework's `VerifySignatureFn` + `NormalizeFn` shapes.

The reference is `blindpay-adapter.ts`:

- `<provider>VerifySignature({ body, headers, secret })`: read provider-specific headers off the Web `Headers` object and call into the package's verifier. Throws on any failure — the framework catches and returns 401.
- `<provider>Normalize({ body, headers })`: produce a `CanonicalWebhookEvent` (see `lib/webhooks/types.ts`). Map the provider's status to `TransactionState` via the package's `state-mapping.ts`; surface `null` for unknown statuses so a new upstream status doesn't block the pipeline.

**Test the adapter** — at minimum: signature pass, missing headers throw, status mapping for 2-3 representative event types.

### 3. Add the route handler

Create `apps/dashboard/src/app/api/webhooks/<provider>/route.ts`:

```ts
import { env } from "@/env";
import {
  transactionRecordService,
  webhookEventService,
} from "@/lib/services";
import {
  <provider>Normalize,
  <provider>VerifySignature,
} from "@/lib/webhooks/<provider>-adapter";
import { createWebhookHandler } from "@/lib/webhooks/handler-factory";
import { getWebhookDedupClient } from "@/lib/webhooks/redis-client";

const PROVIDER = "<provider>" as const;

export async function POST(req: Request): Promise<Response> {
  const secret = env.<PROVIDER>_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      `[security:webhook-signature-failure] provider=${PROVIDER} reason=missing-<PROVIDER>_WEBHOOK_SECRET`,
    );
    return new Response("Webhook receiver not configured", { status: 401 });
  }

  const handler = createWebhookHandler({
    provider: PROVIDER,
    secret,
    verifySignature: <provider>VerifySignature,
    normalize: <provider>Normalize,
    webhookEventService,
    transactionRecordService,
    redis: getWebhookDedupClient(),
  });
  return handler(req);
}
```

Per-provider explicit routes — never a dynamic `[provider]` route. Each provider has its own raw-body parsing config, IP allowlist, and rate-limit profile (D-011).

### 4. (Optional) Add a replay helper

If the provider package doesn't already export a `replay()` helper, add one to `packages/<provider>/src/webhooks.ts` mirroring `packages/blindpay`'s. Engineers run it during local development to re-fire captured fixtures against `pnpm dev:dashboard` without ngrok.

### 5. Update AGENTS.md

In `apps/dashboard/AGENTS.md`'s "Open questions / known gaps" section, move the provider out of the "not yet wired" list. Update the env section if the secret name follows a non-standard convention.

### 6. Run the gates

```bash
cd apps/dashboard && pnpm typecheck && pnpm lint && pnpm test
```

Local replay smoke (separate terminal):

```bash
# Terminal 1: dashboard
BLINDPAY_WEBHOOK_SECRET=whsec_<base64> pnpm dev:dashboard

# Terminal 2: replay
node -e "
  require('@dynamic-demos/<provider>').webhooks.replay({
    payload: require('./fixture.json'),
    url: 'http://localhost:4000/api/webhooks/<provider>',
    webhookSecret: 'whsec_<base64>',
  }).then(r => console.log(r.status));
"
```

Expected: `200`. Check `WebhookEvent` in Postgres for the row; `processingStatus` should be `processed`, `ignored` (no matching transaction), or `failed` (illegal transition) — never `pending`.

### 7. Sandbox subscription

Configure the provider's sandbox webhook subscription to POST to your preview URL: `https://<vercel-preview>/api/webhooks/<provider>`. Sandbox by default (D-005); a production webhook subscription requires `[prod-creds]` PR title.

---

## Common gotchas

- **Don't bypass the framework.** Direct `prisma.webhookEvent.create` calls miss the dedup, signature-verify, and transition validation steps. If you need a custom hook, add a parameter to `createWebhookHandler`.
- **Don't log raw payloads at info level.** Some providers ship PII in payload bodies. The framework logs payloads at debug only — keep that contract.
- **Don't skip `assertValidTransition`.** The state machine is the only place that enforces "money in flight" invariants. If a provider event implies an illegal transition, persisting `processingStatus=failed` is the correct outcome — let it land in the audit trail rather than silently widening the machine.
- **Don't assume signature schemes match across providers.** Most use Svix-style HMAC, but Coinbase uses ECDSA over a different message shape. Always read the provider's package `webhooks.ts` before writing the adapter.

## See also

- `apps/dashboard/AGENTS.md` — webhook framework section.
- `apps/dashboard/src/lib/webhooks/handler-factory.ts` — pipeline implementation.
- `docs/projects/demo-meta-system/DECISIONS.md` — D-010, D-011.
- `docs/projects/demo-meta-system/phases/05a-webhooks.md` — original phase prompt.
