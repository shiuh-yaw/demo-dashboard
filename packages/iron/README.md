# @dynamic-demos/iron

Iron Finance integration package — onramp, offramp, KYC, customer/wallet/bank
management, third-party payments and virtual accounts.

Iron Finance (by MoonPay) provides stablecoin payment infrastructure:

- **Onramp**: fiat → stablecoin
- **Offramp**: stablecoin → fiat
- **Swap**: cross-chain stablecoin exchange
- **Virtual Accounts**: receive payments via named bank accounts
- **Third Party Payments**: external payout/payin services

Sandbox-by-default. Pass `apiKey` explicitly to the client factory along with
`env: 'sandbox' | 'production'` (`sandbox` is the default per D-005). The
package no longer reads `process.env` — the dashboard reads Iron env via
`apps/dashboard/src/lib/iron/client.ts`.

## Quick start

```ts
import { createIronClient } from "@dynamic-demos/iron";

const client = createIronClient({
  apiKey: process.env.IRON_API_KEY!,
  env: "sandbox",
});

const customer = await client.customers.create({
  type: "individual",
  email: "user@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
});

const quote = await client.onramp.quote({
  customer_id: customer.id,
  source_currency: "EUR",
  destination_currency: "USDC",
  payment_rail: "sepa",
  wallet_address: "0x...",
});
```

The 13 namespaces on `IronFinanceClient`: `customers`, `kyc`, `identifications`,
`signings`, `wallets`, `bank`, `onramp`, `offramp`, `quotes`, `thirdPartyPayments`,
`autoramps`, `virtualAccounts`, `metadata`. See `IIronFinanceClient` in
`src/types.ts` for method signatures. A `MockIronClient` mirroring the same
shape is exported for tests.

## Documentation

- [`docs/iron-api.md`](./docs/iron-api.md) — full API surface used by the dashboard.
- [`docs/iron-api-flows.md`](./docs/iron-api-flows.md) — onboarding + ramp flows.
- [Iron Finance docs](https://docs.iron.xyz/) — official.

## Webhooks

Provider-specific webhook signature verification + canonical-event normalization
live in [`src/webhooks.ts`](./src/webhooks.ts). Phase 5A wires these into the
shared dashboard webhook framework.
