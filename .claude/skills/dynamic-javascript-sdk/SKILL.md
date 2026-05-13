---
name: dynamic-javascript-sdk
description: Use when the user asks about the Dynamic Javascript / browser / client-side SDK, wallet picker UI, email OTP authentication, embedded WaaS wallets, or any client-side Dynamic integration. Triggers on phrases like "dynamic javascript sdk", "dynamic client sdk", "headless dynamic", "WaaS wallet", "embedded wallet", "wallet picker", "email OTP with Dynamic", "addEvmExtension". Provided by Dynamic; describes the canonical browser-side pattern for `@dynamic-labs-sdk/client`, `@dynamic-labs-sdk/evm`, and related chain extensions.
---

# Javascript SDK Quickstart

## Purpose and Usage

This document provides structured quickstart information for the Dynamic Javascript SDK. It is designed to be consumed by LLMs to generate accurate installation commands and code examples based on user requirements.

**How to use this document:**

Start by asking the user which path they want:

> "Would you like a **Quick start** (email login + EVM + embedded wallet, zero configuration — recommended if you're just getting started) or a **Custom setup** (choose your chains, auth method, and wallet type)?"

- If the user chooses **Quick start**: follow the Quick Start Path section exactly. Do not ask any configuration questions — execute the happy path as written.
- If the user chooses **Custom setup**: follow the Custom Setup Path section and ask all configuration questions before proceeding.

---

## Quick Start Path

> Use this path when the user chooses Quick start. Execute every step in order. Do not skip steps. Do not ask configuration questions.

**Stack:** Vite + npm + EVM only + email OTP + embedded WaaS wallet

### Step 1 — Prerequisites

Tell the user:
- Node.js 18+ is required
- A Vite-based project (or equivalent bundler) is required — the SDK uses ES module imports that cannot be resolved by a plain `<script>` tag without a bundler or dev server
- A Dynamic environment ID is required — get one at https://app.dynamic.xyz/dashboard/developer/api

Ask the user for their environment ID before proceeding.

### Step 2 — Install

```
npm i @dynamic-labs-sdk/client @dynamic-labs-sdk/evm
```

### Step 3 — Initialize the client and register the EVM extension

```typescript
import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";

const client = createDynamicClient({
  environmentId: "YOUR_ENVIRONMENT_ID",
  metadata: {
    name: "My App",
    url: "http://localhost:5173",
  },
});

// Register extensions immediately after creating the client, before init completes.
// Extension functions take NO arguments — do not pass the client instance.
addEvmExtension();
```

### Step 4 — Build a wallet picker UI (required — SDK has no built-in modal)

The JS SDK is headless — there is no built-in wallet picker or modal. You must build one using `getAvailableWalletProvidersData()`.

```typescript
import { getAvailableWalletProvidersData, connectAndVerifyWithWalletProvider } from "@dynamic-labs-sdk/client";

const providers = await getAvailableWalletProvidersData();

// Render a button for each provider in your UI, then on user selection:
const { otpVerification } = await connectAndVerifyWithWalletProvider({
  walletProvider: selectedProvider,
});
```

### Step 5 — Email OTP authentication

```typescript
import { sendEmailOTP, verifyOTP } from "@dynamic-labs-sdk/client";

// 1. Send OTP to the user's email
const { otpVerification } = await sendEmailOTP({ email: "user@example.com" });

// 2. After user enters the OTP code from their email:
// IMPORTANT: the parameter is `verificationToken`, not `otp`
await verifyOTP({
  otpVerification,
  verificationToken: "123456",
});
```

### Step 6 — Create the WaaS wallet (required — not automatic)

**After `verifyOTP` succeeds, the wallet does not exist yet.** You must call `createWaasWalletAccounts()` explicitly. Do not guard this with an `accounts.length === 0` check — the SDK may return a stale non-zero list immediately after auth, causing the creation step to be silently skipped.

```typescript
// WaaS functions are exported from the /waas subpath
import { getChainsMissingWaasWalletAccounts, createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";

// Call unconditionally immediately after verifyOTP succeeds
const missingChains = getChainsMissingWaasWalletAccounts();
await createWaasWalletAccounts({ chains: missingChains });
```

### Step 7 — Display the wallet address

```typescript
import { getWalletAccounts } from "@dynamic-labs-sdk/client";

// Use wallet.address — not wallet.accountAddress
const accounts = await getWalletAccounts();
const address = accounts[0]?.address;
console.log("Wallet address:", address);
```

### Step 8 — Listen for wallet state changes

```typescript
import { onEvent } from "@dynamic-labs-sdk/client";

// Use onEvent(), not client.on() — client.on() does not exist
onEvent({ event: "walletAccountsChanged" }, (accounts) => {
  const address = accounts[0]?.address;
  console.log("Wallet updated:", address);
}, client);
```

### Step 9 — Logout

```typescript
import { logout } from "@dynamic-labs-sdk/client";

await logout();
```

---

## Custom Setup Path

> Use this path when the user chooses Custom setup. Ask ALL questions below before generating any code.

**Questions to ask the user:**

1. Which package manager do you prefer? (npm, yarn, pnpm, bun)
2. Which chains do you want to support? (EVM, Solana, Sui, Aptos, Bitcoin, Tron, Starknet — one or more)
3. If EVM or Solana: do you need only embedded wallets (smaller bundle) or the full extension including external wallet discovery?
4. If EVM or Solana: do you need WalletConnect for cross-device connections (QR code / deep link)?

**Only after receiving answers**, use the sections below to generate the correct setup.

### Package Manager Commands
- `npm`: `npm i`
- `yarn`: `yarn add`
- `pnpm`: `pnpm add`
- `bun`: `bun add`

### Package Mapping
- Core (always required): `@dynamic-labs-sdk/client`
- EVM: `@dynamic-labs-sdk/evm`
- Solana: `@dynamic-labs-sdk/solana`
- Sui: `@dynamic-labs-sdk/sui`
- Aptos: `@dynamic-labs-sdk/aptos`
- Bitcoin: `@dynamic-labs-sdk/bitcoin`
- Tron: `@dynamic-labs-sdk/tron`
- Starknet: `@dynamic-labs-sdk/starknet`
- WalletConnect (EVM/Solana only, optional): use `addWalletConnectEvmExtension` from `@dynamic-labs-sdk/evm/wallet-connect`, `addWalletConnectSolanaExtension` from `@dynamic-labs-sdk/solana/wallet-connect`. See [WalletConnect Integration](/javascript/reference/wallets/walletconnect-integration).

### Extension Notes
- **Default extensions** (`addEvmExtension`, `addSolanaExtension`) bundle external wallet discovery + embedded (WaaS) support
- **Standalone embedded-only extensions** (`addWaasEvmExtension`, `addWaasSolanaExtension`) produce a smaller bundle — use when the user only needs embedded wallets
- Extension functions take **NO arguments** — do not pass the client instance (e.g. `addEvmExtension()` not `addEvmExtension(client)`)
- Register extensions immediately after `createDynamicClient()`, before initialization completes
- See [Adding EVM Extensions](/javascript/reference/evm/adding-evm-extensions) and [Adding Solana Extensions](/javascript/reference/solana/adding-solana-extensions) for the full list of standalone options

### Post-Auth Patterns (apply to all custom setups that use embedded wallets)

These steps are **required** and are not in the client init — they must be added to your post-auth flow:

- **WaaS wallet creation** — not automatic. Call immediately after auth succeeds:
  ```typescript
  const missingChains = getChainsMissingWaasWalletAccounts();
  await createWaasWalletAccounts({ chains: missingChains });
  ```
- **Wallet address** — use `getWalletAccounts()` → `wallet.address` (not `wallet.accountAddress`)
- **Events** — use `onEvent()`, not `client.on()` (does not exist)
- **OTP verification** — parameter is `verificationToken`, not `otp`

### Valid Combinations
- Any single chain, or any combination of two or more chains
- At least one chain must be selected

### Documentation
All docs for this SDK: https://docs.dynamic.xyz (paths starting with `/javascript/`)
Environment ID: https://app.dynamic.xyz/dashboard/developer/api

---

## Critical API Reference (apply to both paths)

| Correct | Incorrect | Notes |
|---|---|---|
| `addEvmExtension()` | `addEvmExtension(client)` | Extension functions take no arguments |
| `verifyOTP({ otpVerification, verificationToken: '123456' })` | `verifyOTP({ otpVerification, otp: '123456' })` | Parameter is `verificationToken` not `otp` |
| `wallet.address` | `wallet.accountAddress` | Use `address` on objects from `getWalletAccounts()` |
| `onEvent({ event, listener }, client)` | `client.on(event, listener)` | `client.on()` does not exist |
| Call `createWaasWalletAccounts()` unconditionally after auth | Guard with `accounts.length === 0` | Stale list may cause silent skip |

---

## Building a headless integration?

The JavaScript SDK is always headless. See the [Authentication screens](/javascript/authentication-methods/headless-authentication) for a full list of screens your app needs to handle.

---

## Step-Up Authentication

**Required before accepting the `2026_04_01` API version** — verify your
minimum API version in [Dashboard > Developers > API & SDK Keys](https://app.dynamic.xyz/dashboard/developer/api).

The JavaScript SDK is always headless — there is no built-in step-up UI.
**You must always handle step-up authentication manually:** check
requirements, call the appropriate verification method, and wait for the
elevated token before proceeding with the sensitive operation.

See [Step-up authentication](/javascript/authentication-methods/step-up-auth/overview) for the full implementation guide.

---

## Device Registration

**Required before accepting the `2026_04_01` API version** — verify your
minimum API version in [Dashboard > Developers > API & SDK Keys](https://app.dynamic.xyz/dashboard/developer/api).

The JavaScript SDK is always headless — there is no built-in device
registration UI. **You must always handle device registration manually:**
check whether the current device needs registration after auth, detect and
process the email verification redirect, and listen for completion events.

Full guide: https://docs.dynamic.xyz/javascript/authentication-methods/device-registration

---

## Troubleshooting — Dashboard Configuration

If the app builds successfully but login fails, wallets don't appear, or you see network/auth errors, the most common causes are Dynamic dashboard settings that haven't been configured. Ask the user to verify each of the following in their Dynamic dashboard at https://app.dynamic.xyz:

### 1 — Chains not enabled
The EVM chain (or any other chain used in the quickstart) must be enabled under **Chains & Networks** in the dashboard. If the chain isn't toggled on, wallet creation and signing will silently fail or return empty results.

### 2 — Login method not enabled
Email OTP (or whichever login method the app uses) must be toggled on under **Sign-in Methods**. If it isn't enabled, the auth flow will fail at the point of sending the OTP.

### 3 — Embedded wallets not enabled
If the app uses WaaS embedded wallets, the **Embedded Wallets** feature must be enabled under **Wallets** in the dashboard. Without it, `createWaasWalletAccounts()` will return an error or produce no wallet.

### 4 — CORS origin not allowlisted
The URL the app is running on (e.g. `http://localhost:5173`) must be added to the **Allowed Origins** list in the dashboard under **Security**. Without it, all SDK requests will be blocked by CORS. Add the exact origin including port.

If all four are configured and the app is still not working, check the browser console for error codes and refer to https://docs.dynamic.xyz/overview/troubleshooting/general.
