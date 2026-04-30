# Phase 5A — Webhook receiver framework

> **Self-contained agent prompt.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`.

---

## Your role

Build the dashboard-side webhook receiver framework: per-provider routes, idempotency, persistence to the `WebhookEvent` table, state-machine transitions, optional QStash fan-out. Wire one provider end-to-end as the reference (recommend BlindPay for PIX validation).

Ships as **one logical PR** (or two if scope demands: framework first, then BlindPay wiring).

## Wave + dependencies

- Wave 4.
- Depends on Phase 1B (provider packages exist with `webhooks.ts` exporting verify/normalize), Phase 1E (transactions package merged), Phase 2 (`WebhookEvent` model migrated).

## Skills

1. `superpowers:using-git-worktrees` — `.worktrees/phase-5a-webhooks`, branch `phase/05a-webhooks`.
2. `superpowers:writing-plans`.
3. `superpowers:test-driven-development` — fixture-replay tests for receiver path.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch.
- Per-provider explicit routes (`/api/webhooks/<provider>`), not a dynamic route. Each route can have provider-specific raw-body parsing.
- Signature verification first, body parsing second.
- Idempotency via Redis SETNX with TTL=7 days.
- Persistence via `packages/db` (Postgres `WebhookEvent` model).
- State transitions go through `@dynamic-demos/transactions` helpers.
- No PII in logs above debug level.
- Failed-signature alerts route to a security channel (use console.error tagged with `[security:webhook-signature-failure]` for now; real alerting wired later).

## Required reading

- `apps/dashboard/src/app/api/blindpay/` — existing BlindPay endpoints (some webhook code may already be there to reference).
- `packages/blindpay/src/webhooks.ts` — the verify + normalize functions (Phase 1B output).
- `packages/transactions/src/machine.ts` — transition helpers.
- `packages/db/prisma/schema.prisma` — `WebhookEvent` model.
- `apps/dashboard/src/app/api/internal/worker/route.ts` — existing QStash worker pattern.
- `apps/spark26/lib/upstash/ratelimit.ts` — rate limit pattern (do not modify; just reference).
- `DECISIONS.md` D-011, D-010.

## What needs to happen

### 1. Create framework helpers

#### `apps/dashboard/src/lib/webhooks/idempotency.ts`

```ts
export async function dedupOrThrow(
  redis: Redis,
  provider: string,
  eventId: string
): Promise<void> {
  const key = `webhook:${provider}:${eventId}`;
  const set = await redis.set(key, '1', { nx: true, ex: 60 * 60 * 24 * 7 });
  if (!set) throw new DuplicateEventError(provider, eventId);
}

export class DuplicateEventError extends Error { ... }
```

#### `apps/dashboard/src/lib/webhooks/persist.ts`

```ts
export async function persistWebhookEvent(input: CanonicalWebhookEvent): Promise<WebhookEvent> {
  return prisma.webhookEvent.create({ data: { ... } });
}
```

#### `apps/dashboard/src/lib/webhooks/route.ts`

```ts
export async function routeWebhookEvent(event: CanonicalWebhookEvent): Promise<void> {
  // 1. Update transactions table if event references a known transaction.
  // 2. State transition via packages/transactions helpers.
  // 3. Optionally enqueue QStash job for heavy reconciliation.
  // 4. Mark webhookEvent.processingStatus = 'processed' or 'unrouted'.
}
```

State transitions are wrapped in try/catch around `assertValidTransition`. Illegal transitions log + alert + mark `processingStatus = 'failed'` with `processingError`.

#### `apps/dashboard/src/lib/webhooks/handler-factory.ts`

Factory generating Next.js route handlers given a provider name + verify + normalize + ratelimit config:

```ts
export function createWebhookHandler(opts: {
  provider: string;
  verifySignature: (req: Request) => Promise<unknown>;
  normalize: (raw: unknown) => CanonicalWebhookEvent;
  rateLimit?: Ratelimit;
}): NextRouteHandler {
  return async (req: Request) => {
    // 1. Rate limit (drop to 429 if exceeded).
    // 2. Capture raw body bytes (some providers sign raw bytes).
    // 3. Verify signature → throws 401 on failure.
    // 4. Parse + normalize.
    // 5. dedupOrThrow → 200 if duplicate.
    // 6. persistWebhookEvent.
    // 7. routeWebhookEvent.
    // 8. Return 200 fast.
    // Errors → 500 with structured log. Provider sees retry.
  };
}
```

### 2. Wire BlindPay end-to-end

Create `apps/dashboard/src/app/api/webhooks/blindpay/route.ts`:

```ts
import { createWebhookHandler } from '@/lib/webhooks/handler-factory';
import { webhooks as blindpayWebhooks } from '@dynamic-demos/blindpay';

export const POST = createWebhookHandler({
  provider: 'blindpay',
  verifySignature: blindpayWebhooks.verifySignature,
  normalize: blindpayWebhooks.normalize,
});

// Per-provider raw-body config if needed:
export const config = { api: { bodyParser: false } };
```

### 3. Tests

`apps/dashboard/src/lib/webhooks/__tests__/handler-factory.test.ts`:

- Valid signature + new event → 200, `WebhookEvent` row created, transaction state updated.
- Valid signature + duplicate event → 200, no new row.
- Invalid signature → 401, no row.
- Rate-limit exceeded → 429.
- Unrouted (no matching transaction) → 200, row created with `processingStatus = 'unrouted'`.
- Illegal state transition → 200, row created with `processingStatus = 'failed'`, log.

Use a real-payload fixture from BlindPay's webhook docs (scrubbed of any PII). Sign it with a test secret.

### 4. Replay helper for development

Per-provider replay: `packages/blindpay/src/webhooks.ts` exports `replay(fixturePath, dashboardUrl)`. Useful for local testing without ngrok.

```ts
export async function replay(opts: {
  fixturePath: string;
  dashboardUrl: string;
  webhookSecret: string;
}): Promise<Response> { ... }
```

### 5. Logging convention

Every receipt logs once at info level:

```
[webhook:blindpay] received eventId=abc-123 type=transfer.confirmed dedup=false durMs=42 signatureValid=true status=processed
```

No raw payload at info. Debug-level can include raw payload.

### 6. Documentation

Update `apps/dashboard/AGENTS.md` (Phase 3 may need re-touch) to document the webhook surface and add stubs for adding a new provider receiver.

Add `docs/engineering/add-new-webhook-receiver.md`: short runbook for engineers wiring a new provider's webhooks.

## Acceptance criteria

- [ ] Framework helpers (`idempotency`, `persist`, `route`, `handler-factory`) exist with tests.
- [ ] `apps/dashboard/src/app/api/webhooks/blindpay/route.ts` wired end-to-end.
- [ ] Replay helper for local testing.
- [ ] Fixture-replay tests cover all six branches above.
- [ ] State transitions go through `@dynamic-demos/transactions`; illegal transitions persisted as failed.
- [ ] Logs structured per convention.
- [ ] Other providers' webhook routes (alfredpay, iron, coinbase) **not yet wired** — those land as separate small PRs after this framework merges. Out of scope for this PR.
- [ ] CI gates pass.

## Commit plan

1. `feat(webhooks): add idempotency + persist + route + handler-factory helpers`
2. `feat(webhooks): wire BlindPay receiver end-to-end`
3. `feat(blindpay): add replay helper for local testing`
4. `test(webhooks): fixture replay tests covering all branches`
5. `docs(engineering): add-new-webhook-receiver runbook`

## PR title

`feat(webhooks): Phase 5A — receiver framework + BlindPay reference wiring`

## PR description

```
## Phase 5A of demo meta-system

Adds the dashboard-side webhook receiver framework. Per-provider explicit routes; signature verify → dedup → persist → route → ack. BlindPay wired as the reference; alfredPay/iron/coinbase routes follow as separate small PRs.

### What changed
- `apps/dashboard/src/lib/webhooks/`: idempotency, persist, route, handler-factory helpers.
- `apps/dashboard/src/app/api/webhooks/blindpay/route.ts`: end-to-end wiring.
- `packages/blindpay/src/webhooks.ts`: adds `replay()` helper for local testing.
- Fixture-replay tests for all branches (valid, duplicate, invalid signature, rate-limited, unrouted, illegal transition).

### Spark26
Untouched.

### Out of scope
- alfredpay, iron, coinbase webhook routes (separate PRs after this framework merges).
- Real-time admin view of webhook events (Phase 8).

### References
- `DECISIONS.md` (D-010, D-011)
- Phase prompt: `docs/projects/demo-meta-system/phases/05a-webhooks.md`
```

After merge, update `PROGRESS.md` row "5A. Webhook framework" to `🟢 done`.
