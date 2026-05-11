# Visa Direct Host Portal

An Airbnb-style branded host portal demonstrating **Visa Direct stablecoin payouts** to crypto wallets. Hosts log in, configure their preferred payout method, and receive USDC payouts via the Visa Direct Push-to-Wallet API — with **Fireblocks** as the orchestration and custody layer and **MTLco** as the on-ramp (USD → USDC).

This is a sales demo for Visa Direct and financial institution partners.

## Features

- **Email OTP + Google SSO** — authentication via the [Dynamic JavaScript SDK](https://www.dynamic.xyz/docs/javascript)
- **Payout methods** — bank account, crypto wallet (BYO CeFi or embedded), and debit card
- **Embedded wallets** — Fireblocks-secured wallets created via Dynamic
- **Visa Direct → Fireblocks payload mapping** — documented, side-by-side drawer
- **Live payout flow** — `POST /api/payout` calls Visa Direct (stub) and maps to Fireblocks `createTransaction`
- **Transaction history** — past payouts with Visa Direct / Fireblocks status badges
- **User metadata persistence** — payout preferences stored via Dynamic admin API (falls back to `localStorage`)

## Architecture

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   ├── globals.css
│   ├── (auth)/
│   │   └── login/                # Email OTP + Google SSO
│   ├── (app)/
│   │   ├── layout.tsx            # Authenticated app shell
│   │   ├── payment-methods/      # Configure payout methods
│   │   └── transactions/         # Payout history + API payload drawer
│   └── api/
│       ├── auth/sync-cookie/     # Sync Dynamic session → httpOnly cookie
│       ├── preferences/          # Read/write payout preferences
│       ├── payout/               # Trigger Visa Direct → Fireblocks payout
│       │   └── status/           # Poll payout status
│       └── transactions/         # List payouts
├── components/
│   ├── layouts/                  # AppShell, DashboardLayout
│   ├── dashboard/                # DashboardHeader
│   ├── screens/                  # payment-methods, payout-modal, transaction-history, api-payload-drawer
│   ├── dynamic-init.tsx          # SDK bootstrap
│   └── ui/                       # Reusable primitives (payout-method-card, wallet-option-card, etc.)
├── contexts/
│   └── visa-direct-config-context.tsx
├── hooks/
│   ├── use-auth.ts
│   ├── use-client-initialized.ts
│   ├── use-primary-wallet.ts
│   └── use-wallet-accounts.ts
├── lib/
│   ├── env.ts                    # Zod-validated env (via @t3-oss/env-nextjs)
│   ├── constants.ts
│   ├── format.ts
│   ├── get-error-message.ts
│   ├── mock-data.ts              # Typed mocks (host, bank, card, transactions)
│   ├── network-config.ts
│   ├── visa-direct-config.ts     # Branding → CSS custom properties
│   ├── auth/                     # Session + cookie helpers
│   ├── dynamic/                  # Dynamic SDK wrappers
│   └── api/
│       ├── visa-direct.ts        # Visa Direct client (stubbed)
│       ├── fireblocks.ts         # Fireblocks client (mock when creds absent)
│       └── payload-mapper.ts     # Visa Direct → Fireblocks mapping
├── middleware.ts                 # Route protection
├── app.config.ts                 # AppAuthConfig (auth, KYC, return path)
└── next.config.ts
```

## Visa Direct → Fireblocks payload mapping

The mapping in [`lib/api/payload-mapper.ts`](lib/api/payload-mapper.ts) is the core demo talking point. See the table below for the key field translations:

| Visa Direct `sendPayout` field                | Fireblocks `createTransaction` field            |
| --------------------------------------------- | ----------------------------------------------- |
| `recipientDetail.firstName` + `lastName`      | `note` (name match display)                     |
| `recipientDetail.cryptoWallet.address`        | `destination.oneTimeAddress.address`            |
| `recipientDetail.cryptoWallet.blockchain`     | `assetId` prefix (`USDC_ETH`, `USDC_SOL`, ...)  |
| `recipientDetail.cryptoWallet.asset`          | `assetId`                                       |
| `transactionDetail.amount`                    | `amount`                                        |
| `senderDetail.senderReferenceNumber`          | `externalTxId`                                  |
| `clientReferenceId`                           | `customerRefId`                                 |

Fireblocks source is always `{ type: "VAULT_ACCOUNT", id: FIREBLOCKS_VAULT_ACCOUNT_ID }` — the MTLco connected sub-account.

## Setup

1. **Install dependencies** (from the monorepo root):

   ```bash
   pnpm install
   ```

2. **Configure environment:**

   ```bash
   cp apps/visa-direct/.env.example apps/visa-direct/.env
   ```

   Fill in at minimum:

   ```
   NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your-dynamic-env-id
   FIREBLOCKS_VAULT_ACCOUNT_ID=your-mtlco-account-id
   FIREBLOCKS_PROVIDER_ID=FIREBLOCKS_TESTNET
   FIREBLOCKS_ASSET_ID=USDC_ETH_TEST5_0GER
   ```

   All Fireblocks/Visa Direct credentials are optional — the app falls back to mock responses so the demo works without real keys.

3. **Run the dev server:**

   ```bash
   pnpm dev --filter @dynamic-demos/visa-direct
   # or from apps/visa-direct
   pnpm dev
   ```

   The app runs on [http://localhost:4007](http://localhost:4007).

## Environment variables

Validated in [`lib/env.ts`](lib/env.ts) with [`@t3-oss/env-nextjs`](https://env.t3.gg/) + Zod.

| Variable                              | Required | Description                                                                         |
| ------------------------------------- | :------: | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`  |    ✓     | Dynamic Labs environment ID (shared with every demo in the monorepo)                |
| `DYNAMIC_API_KEY`                     |          | Dynamic admin API key — enables cross-device preferences via user metadata          |
| `FIREBLOCKS_VAULT_ACCOUNT_ID`         |    ✓     | MTLco connected sub-account ID (used as `via.accountId`)                            |
| `FIREBLOCKS_PROVIDER_ID`              |    ✓     | `FIREBLOCKS_TESTNET` (sandbox) or `FIREBLOCKS` (mainnet)                            |
| `FIREBLOCKS_ASSET_ID`                 |    ✓     | e.g. `USDC_ETH_TEST5_0GER` (Sepolia) or `USDC_ETH` (mainnet)                        |
| `FIREBLOCKS_API_KEY`                  |          | API user key — when absent, the client returns mock responses                       |
| `FIREBLOCKS_API_SECRET`               |          | RSA private key (base64 PEM or raw PEM with `\n`)                                   |
| `VISA_DIRECT_API_KEY`                 |          | Visa Direct API key (stubbed in current phases)                                     |
| `VISA_DIRECT_BASE_URL`                |          | Visa Direct base URL                                                                |

Server-only secrets (`FIREBLOCKS_API_KEY`, `FIREBLOCKS_API_SECRET`, `VISA_DIRECT_API_KEY`, `DYNAMIC_API_KEY`) are never exposed to the client — all Visa Direct and Fireblocks calls go through Next.js API routes.

## Branding

Airbnb-style host portal. Palette is mapped to `--widget-*` CSS custom properties in [`lib/visa-direct-config.ts`](lib/visa-direct-config.ts):

| Role       | Color     |
| ---------- | --------- |
| Primary    | `#FF5A5F` (coral) |
| Secondary  | `#00A699` (teal)  |
| Background | `#F7F7F7` |
| Card       | `#FFFFFF` |
| Text       | `#484848` |
| Muted      | `#767676` |
| Border     | `#EBEBEB` |
| Success    | `#008A05` |
| Error      | `#C13515` |

Never hardcode hex colors in components — always consume via `--widget-*` variables.

## Scripts

| Script           | Description                                    |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | Start Next.js dev server on port **4007**      |
| `pnpm build`     | Production build                               |
| `pnpm start`     | Start the production server                    |
| `pnpm lint`      | Run ESLint                                     |
| `pnpm typecheck` | TypeScript `--noEmit` check                    |

## Conventions

- **pnpm only** — never `npm` or `yarn`
- **Package name:** `@dynamic-demos/visa-direct`
- **Dev port:** `4007`
- Mirror [`apps/remittance`](../remittance) for patterns (hooks, layouts, contexts, config)
- TypeScript strict — zero errors, zero warnings
- One component per file; sentence case in UI text
- No hardcoded data — always read from [`lib/mock-data.ts`](lib/mock-data.ts)
- Server secrets in API routes only

## Learn more

- [Dynamic JS SDK docs](https://www.dynamic.xyz/docs/javascript)
- [Visa Direct Push-to-Wallet](https://developer.visa.com/capabilities/visa-direct)
- [Fireblocks Trading API](https://developers.fireblocks.com/reference/api-trading-overview)
