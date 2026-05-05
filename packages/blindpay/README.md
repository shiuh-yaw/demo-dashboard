# @dynamic-demos/blindpay

Sandbox-by-default BlindPay client extracted from
`apps/dashboard/src/lib/services/blindpay.ts` (Phase 1B of the demo
meta-system).

```ts
import { createBlindpayClient } from "@dynamic-demos/blindpay";

const blindpay = createBlindpayClient({
  env: "sandbox", // D-005: sandbox by default
  instanceId: process.env.BLINDPAY_INSTANCE_ID!,
  apiKey: process.env.BLINDPAY_API_KEY!,
});

const quote = await blindpay.createPayoutQuote({
  bank_account_id: "ba_...",
  currency_type: "sender",
  cover_fees: false,
  request_amount: 10_000, // cents
  network: "base_sepolia",
  token: "USDC",
});
```

## Layout

```
src/
  index.ts          public exports
  client.ts         REST client (factory)
  types.ts          shared request/response types
  env.ts            BlindpayEnvironment + endpoint resolution
  state-mapping.ts  provider status -> canonical state (Phase 1E swap pending)
  webhooks.ts       Svix HMAC-SHA256 verify + event normalization
  __tests__/
    smoke.test.ts
    client.test.ts
    state-mapping.test.ts
    webhooks.test.ts
docs/
  blindpay-api.md   moved from apps/dashboard/src/app/api/blindpay/README.md
```

## See also

- `AGENTS.md` — frontmatter + canonical capabilities
- `docs/blindpay-api.md` — full reference for the dashboard `/api/blindpay/*`
  surface that wraps this package.
