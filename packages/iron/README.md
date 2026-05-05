# @dynamic-demos/iron

Iron Finance integration package — onramp, offramp, KYC, customer/wallet/bank
management, third-party payments and virtual accounts.

Iron Finance (by MoonPay) provides stablecoin payment infrastructure:

- **Onramp**: fiat → stablecoin
- **Offramp**: stablecoin → fiat
- **Swap**: cross-chain stablecoin exchange
- **Virtual Accounts**: receive payments via named bank accounts
- **Third Party Payments**: external payout/payin services

Sandbox-by-default. Pass `env: 'sandbox' | 'production'` to the client factory or
allow it to inherit from `IRON_ENVIRONMENT` (defaults to `sandbox`).

## Quick start

```ts
import { createIronClient } from "@dynamic-demos/iron";

const client = createIronClient({
  env: "sandbox",
  apiKey: process.env.IRON_API_KEY!,
});

const customer = await client.createCustomer({
  type: "individual",
  email: "user@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
});
```

A pre-configured singleton (`ironClient`) is exported for convenience and reads
`IRON_API_KEY` / `IRON_ENVIRONMENT` from `process.env`. Prefer `createIronClient`
for testability.

## Documentation

- [`docs/iron-api.md`](./docs/iron-api.md) — full API surface used by the dashboard.
- [`docs/iron-api-flows.md`](./docs/iron-api-flows.md) — onboarding + ramp flows.
- [Iron Finance docs](https://docs.iron.xyz/) — official.

## Webhooks

Provider-specific webhook signature verification + canonical-event normalization
live in [`src/webhooks.ts`](./src/webhooks.ts). Phase 5A wires these into the
shared dashboard webhook framework.
