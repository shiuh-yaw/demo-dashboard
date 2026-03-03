# @dynamic-demos/fireblocks

Wraps the official [`@fireblocks/ts-sdk`](https://github.com/fireblocks/ts-sdk) with simplified types and a mock client for local development.

## Quick Start

```ts
import { createFireblocksClient } from "@dynamic-demos/fireblocks";

// Returns real client when credentials are set, mock client otherwise
const client = createFireblocksClient();

// Create a vault and get deposit addresses
const vault = await client.createVaultAccount("My Vault");
await client.createVaultWallet(vault.id, "BASE_USDC");
const addresses = await client.getDepositAddresses(vault.id, "BASE_USDC");

// Screen an address for AML/CFT compliance
const result = await client.screenAddress(addresses[0].address, "BASE_USDC");
console.log(result.verdict); // "PASSED" | "FLAGGED" | "BLOCKED" | "PENDING"

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
| `FIREBLOCKS_API_SECRET` or `FIREBLOCKS_SECRET_KEY` | PEM-encoded RSA private key |
| `FIREBLOCKS_API_BASE_URL` or `FIREBLOCKS_BASE_PATH` | API base URL (defaults to `BasePath.Sandbox`) |

When credentials are absent, `createFireblocksClient()` returns a `MockFireblocksClient` that simulates realistic responses with configurable delays — no Fireblocks account needed for local development.

## Architecture

```
src/
├── types.ts            # IFireblocksClient interface + all shared types
├── client.ts           # Real client wrapping @fireblocks/ts-sdk
├── mock-client.ts      # Mock client with simulated delays
├── factory.ts          # createFireblocksClient() factory
└── vault/
    └── omnibus.ts      # Omnibus vault structure for remittance
```

### Factory Pattern

`createFireblocksClient(config?)` accepts an optional `FireblocksConfig`. If no config is provided, it reads from environment variables. If neither config nor env vars are available, it falls back to the mock client.

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
| `createFireblocksClient(config?)` | Factory — returns real or mock client |
| `FireblocksClient` | Real client wrapping `@fireblocks/ts-sdk` |
| `MockFireblocksClient` | Mock client class for development |

### Omnibus Vault

| Export | Description |
|--------|-------------|
| `createOmnibusStructure(client, name?, assetId?)` | Set up omnibus vault |
| `getDepositAddressForUser(client, vaultId, assetId?)` | Get user deposit address |
| `getOmnibusVaultBalance(client, vaultId)` | Get omnibus vault balance |

### Screening Utilities

| Export | Description |
|--------|-------------|
| `isScreeningPassed(result)` | Check if screening verdict is `"PASSED"` |
| `getScreeningRiskLevel(result)` | Classify risk: `"low"` (<0.3) / `"medium"` (<0.7) / `"high"` |

```ts
import {
  createFireblocksClient,
  isScreeningPassed,
  getScreeningRiskLevel,
} from "@dynamic-demos/fireblocks";

const client = createFireblocksClient();
const result = await client.screenAddress("0xabc...", "BASE_USDC");

if (!isScreeningPassed(result)) {
  console.log(`Blocked: risk=${getScreeningRiskLevel(result)}`);
}
```
