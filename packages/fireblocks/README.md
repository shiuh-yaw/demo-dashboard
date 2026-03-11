# @dynamic-demos/fireblocks

Wraps the official [`@fireblocks/ts-sdk`](https://github.com/fireblocks/ts-sdk) with simplified types and a mock client for local development.

## Quick Start

```ts
import { createFireblocksClient } from "@dynamic-demos/fireblocks";

// Real client (requires FIREBLOCKS_API_KEY + FIREBLOCKS_API_SECRET)
const client = createFireblocksClient();

// Or explicitly use mock for local development
// const client = createFireblocksClient({ useMock: true });

// Create a vault and get deposit addresses
const vault = await client.createVaultAccount("My Vault");
await client.createVaultWallet(vault.id, "BASE_USDC");
const addresses = await client.getDepositAddresses(vault.id, "BASE_USDC");

// Create a transaction
const tx = await client.createTransaction({
  assetId: "BASE_USDC",
  source: { type: "VAULT_ACCOUNT", id: vault.id },
  destination: { type: "ONE_TIME_ADDRESS", address: "0x..." },
  amount: "100.00",
});
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FIREBLOCKS_API_KEY` | API key from the Fireblocks console |
| `FIREBLOCKS_API_SECRET` | PEM-encoded RSA private key |
| `FIREBLOCKS_API_BASE_URL` | API base URL (defaults to `BasePath.Sandbox`) |

Pass `useMock: true` to use `MockFireblocksClient` without credentials (e.g. for local development).

## Architecture

```
src/
├── config.ts           # Credential resolution from env
├── types.ts            # IFireblocksClient interface + all shared types
├── client.ts           # Real client wrapping @fireblocks/ts-sdk
├── mock-client.ts      # Mock client with simulated delays
├── factory.ts          # createFireblocksClient() factory
└── vault.ts            # getOrCreateDepositAddress helper
```

### Factory Pattern

`createFireblocksClient(config?)` requires credentials (from config or env) unless `useMock: true` is passed. Throws when credentials are missing and mock is not requested.

### Mock Client

`MockFireblocksClient` implements the full `IFireblocksClient` interface with:

- Configurable response delay (default 600ms)
- Simulated transaction progression through statuses
- Deterministic mock data for vault accounts and deposit addresses

```ts
import { MockFireblocksClient } from "@dynamic-demos/fireblocks";

const mock = new MockFireblocksClient({ delayMs: 200 });
```

## API Reference

### Client

| Export | Description |
|--------|-------------|
| `createFireblocksClient(config?)` | Factory — returns real client (requires creds) or mock (useMock: true) |
| `FireblocksClient` | Real client wrapping `@fireblocks/ts-sdk` |
| `MockFireblocksClient` | Mock client class for development |

### Vault Operations

| Export | Description |
|--------|-------------|
| `getOrCreateDepositAddress(client, name, assetId)` | Get or create deposit address for vault by name |
