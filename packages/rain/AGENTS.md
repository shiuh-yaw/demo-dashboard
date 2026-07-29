---
name: "@dynamic-demos/rain"
kind: package
flow_role: payouts
custody: non-custodial
status: experimental
provider:
  name: Rain (raincards.xyz)
  docs: https://docs.rain.xyz/
  api_reference: https://docs.rain.xyz/
  agent_docs: none
  status_page: none
---

# @dynamic-demos/rain

Server-side typed HTTP wrapper over the Rain issuing API (virtual stablecoin
debit cards). Modeled on `@dynamic-demos/iron`. `flow_role: payouts` reflects
the card's core money movement - spending the user's stablecoin balance
outward to merchants.

## Provider documentation

If you are an AI agent integrating against Rain, **consult the provider docs
first**:

- **Main docs:** [docs.rain.xyz](https://docs.rain.xyz/) (access-gated - the
  access code is held out of the repo; ask the maintainer).
- **Sandbox API base:** `https://api-dev.raincards.xyz`.

## Public surface

- `RainClient` / `RainRequester` / `RainApiError` (`client.ts`) - fetch-based
  client; `Api-Key` header, `cache: no-store`, errors carry `status` +
  `details`. Constructor takes explicit `{ baseUrl?, apiKey?, fetchImpl? }`
  and never reads `process.env`.
- Methods (`methods.ts`) over a `RainRequester`: `createUserApplication`,
  `createCardForUser`, `userCreditBalance`, `cardEncryptedData`,
  `createUserDepositContract`, `userDepositContract`, `transactions`,
  `userWithdrawalSignature` (polls while Rain returns `status:"pending"`).
- `createFakeRainClient()` (`mock-client.ts`) - in-memory `RainRequester` for
  tests / non-network demos.
- Types (`types.ts`) - Rain request/response shapes.
- **`./client` entry** (`src/client/`, separate export so the server SDK above
  stays free of React deps) - `useRainCardStore()` + `rainCardRef()`. The
  platform-provided **card storage/retrieval contract**: a consuming app reads
  (`card`) and persists (`save`/`clear`) its Rain card on the Dynamic user
  record's metadata, client-side via `@dynamic-labs-sdk/react-hooks`
  (`useUser`/`useUpdateUser`) - no admin token. `rainCardRef(card)` returns the
  `{ id, userId }` the dashboard needs, sent as `x-rain-card-id` /
  `x-rain-user-id`. `react` + `@dynamic-labs-sdk/react-hooks` are optional peer
  deps (server-only consumers of the root export don't need them).

## Invariants

- Sandbox-by-default (`RAIN_SANDBOX_BASE_URL`); production is a dashboard env
  override gated by `[prod-creds]`.
- The client never reads env; `apps/dashboard/src/lib/rain/client.ts` is the
  only sanctioned env-reader (holds `RAIN_API_KEY`).
- No card-secret crypto here - the RSA/AES reveal is client-side (widget).
