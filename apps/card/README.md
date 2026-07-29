# Dynamic JS SDK Card Demo

A Next.js example demonstrating a stablecoin debit card flow (Rain issuer)
using the [Dynamic JavaScript SDK](https://www.dynamic.xyz/docs/javascript).

Phase 1 (this scaffold) ships the app shell, Dynamic client wiring (EVM
only), and a minimal login screen. Later phases add the Rain apply
flow, card reads, crypto reveal, funding, and a sandbox faucet.

## Features (Phase 1)

- **Email OTP authentication** - passwordless login via email one-time password.
- **Social OAuth** - login with any dashboard-enabled social provider.
- **Embedded wallets (WaaS)** - EVM wallet tied to the user's account.
- **Native EIP-7702 gas sponsorship** - Dynamic's `sendSponsoredTransaction`
  (`@dynamic-labs-sdk/evm`) relays gasless funding/faucet transactions,
  auto-signing the 7702 delegation on first send. No ZeroDev.

## Architecture

```
├── app/
│   ├── layout.tsx      # Minimal server layout
│   ├── providers.tsx   # QueryClientProvider + client-side DynamicProvider
│   ├── page.tsx         # Login/entry screen (client component)
│   ├── apply/page.tsx   # Rain apply flow
│   ├── card/page.tsx    # Card view (balance, fund, activity)
│   └── globals.css      # Theme variables and global styles
├── components/
│   └── dynamic-gate.tsx # useInitStatus gate + FullScreenSpinner
├── lib/
│   ├── dynamic-client.ts # SSR-safe Dynamic client singleton
│   ├── gasless/          # Native gas-sponsorship call builders
│   ├── balances/          # viem RUSDC balance reads
│   ├── rain-crypto/       # WebCrypto card-secret reveal
│   └── constants.ts       # Base Sepolia + RUSDC constants
├── __tests__/
│   └── smoke.test.ts
├── app.config.ts        # Client-side auth config (kyc: none, flat routes)
└── middleware.ts         # Config-forwarding middleware
```

## Getting started

```bash
pnpm install
cp apps/card/.env.example apps/card/.env.local
pnpm --filter @dynamic-demos/card dev
```

Runs on port 4011.

## Sandbox only

Base Sepolia only in Phase 1. This app never holds `RAIN_API_KEY` - Rain is
reached only through the dashboard's `/api/rain/*` routes.
