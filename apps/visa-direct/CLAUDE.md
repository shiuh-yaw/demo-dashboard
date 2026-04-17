# Visa Direct Host Portal — Claude Code Instructions

## What this is
An Airbnb-style branded host portal demonstrating Visa Direct stablecoin payouts
to crypto wallets. Hosts log in, configure their preferred payout method, and
receive USDC payouts via Visa Direct Push-to-Wallet API — with Fireblocks
acting as the orchestration and custody layer and MTLco as the on-ramp (USD→USDC).

This is a sales demo for Visa Direct and financial institution partners.
It must look polished, tell the story clearly, and work end-to-end for the
push-to-wallet flow.

## MVP Phases — build ONLY the current phase
Do not build future phases unless explicitly asked.

### Phase 1 (current): Skeleton + Payment Methods page
- App shell with Airbnb-style branding (coral/white/grey)
- Login page: email OTP + Google SSO via Dynamic SDK
- Payment Methods page: three fully active payout method cards (see below)
- Demo payment button visible on every app page (stubbed modal in Phase 1)
- Every phase ends with a working: pnpm dev

### Phase 2: Wallet setup flows
- BYO CeFi wallet: Dynamic CeFi connector (Kraken) — OAuth sign-in,
  balance preview via `getKrakenAccounts`, name-match verification against
  the Dynamic host profile
- Embedded wallet: OTP confirmation flow
- After setup: show wallet address on card, "Set as default" button
- Storing wallet selection and default preference in Dynamic user metadata

### Phase 3: Live payout flow
- Demo payment button opens modal: enter amount → confirm → trigger payout
- POST /api/payout: call Visa Direct API (stub) → map to Fireblocks createTransaction
- Show compliance steps inline: wallet verification → AML → sanctions → execute
- Poll for status, show result with transaction ID

### Phase 4: Transaction history
- List past payouts with status badges
- Each row has "View API payload" button — opens drawer showing Visa Direct
  request + Fireblocks createTransaction payload side-by-side

## Primary reference: apps/remittance
Use apps/remittance as the gold standard for ALL patterns:
- File and folder structure
- Component imports: WidgetCard, Button, Input, Spinner from @dynamic-demos/ui
- Hook patterns: use-auth, use-client-initialized, use-primary-wallet
- Layout: AppShell → DashboardLayout → DashboardHeader
- Context pattern: config context with CSS custom properties (--widget-*)
- app.config.ts using AppAuthConfig from @dynamic-demos/dynamic
- Screen component pattern: named export, props interface, step state machine
- CSS variables: --widget-primary, --widget-fg, --widget-muted, --widget-border,
  --widget-row-bg, --widget-row-hover, --widget-success, --widget-accent,
  --widget-radius, --widget-card-gradient-start, --widget-card-gradient-end

Do NOT copy remittance files. Understand the pattern, implement for this use case.

## Branding — Airbnb-style host portal
Primary:    #FF5A5F  (Airbnb coral — buttons, active states, default badge)
Secondary:  #00A699  (Airbnb teal — accents)
Background: #F7F7F7
Card:       #FFFFFF
Text:       #484848
Muted:      #767676
Border:     #EBEBEB
Success:    #008A05
Error:      #C13515

Map to CSS custom properties in visa-direct-config.ts:
  primaryColor: "#FF5A5F"
  secondaryColor: "#00A699"

App name in header: "Airbnb Host Portal"
Subtitle: "Powered by Fireblocks"
Demo banner (gold left border): "⚡ Demo environment — Visa Direct × Fireblocks"

## Monorepo rules
- Package manager: pnpm only — never npm or yarn
- Package name: @dynamic-demos/visa-direct
- Dev port: 4006
- Never modify files outside apps/visa-direct
- Never change monorepo root config without asking
- Dependency versions: mirror apps/remittance/package.json exactly

## package.json
{
  "name": "@dynamic-demos/visa-direct",
  "version": "0.1.0",
  "description": "Visa Direct stablecoin payout demo — Airbnb host portal",
  "private": true,
  "scripts": {
    "dev": "next dev -p 4006",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit"
  }
}

## Environment variables (validated in lib/env.ts with @t3-oss/env-nextjs + zod)
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=2e7eaa59-ff99-4afb-a341-0605a3568cd2
FIREBLOCKS_API_KEY=           # server-only
FIREBLOCKS_API_SECRET=        # server-only (base64 PEM)
FIREBLOCKS_VAULT_ACCOUNT_ID=  # MTLco connected sub-account ID
VISA_DIRECT_API_KEY=          # server-only (stubbed Phase 1-2)
VISA_DIRECT_BASE_URL=         # configurable per environment

Never expose FIREBLOCKS_API_KEY, FIREBLOCKS_API_SECRET, or VISA_DIRECT_API_KEY
to the client. All Fireblocks and Visa Direct calls go through Next.js API routes.

## app.config.ts
Mirror remittance app.config.ts. Use AppAuthConfig from @dynamic-demos/dynamic.
  auth: { emailOtp: true, socialProviders: ["google"], externalJwt: true }
  kyc: "none"
  defaultReturnPath: "/payment-methods"

## File structure
/app
  /layout.tsx
  /(auth)
    /login/page.tsx
  /(app)
    /layout.tsx
    /(vd)
      /layout.tsx
      /payment-methods/page.tsx
      /transactions/page.tsx        — Phase 4 only
/components
  /layouts
    /app-shell.tsx
    /dashboard-layout.tsx
  /dashboard
    /dashboard-header.tsx
  /screens
    /payment-methods-screen.tsx     — Phase 1 core screen
    /auth-screen.tsx
    /payout-modal.tsx               — Phase 1 stub, wired Phase 3
    /transaction-history-screen.tsx — Phase 4
    /api-payload-drawer.tsx         — Phase 4
  /ui
    /widget-layout.tsx
    /error-message.tsx
    /payout-method-card.tsx         — reusable card for each payout type
    /wallet-option-card.tsx         — BYO vs embedded sub-option card
/contexts
  /visa-direct-config-context.tsx
/hooks
  /use-auth.ts
  /use-client-initialized.ts
  /use-primary-wallet.ts
  /use-wallet-accounts.ts
/lib
  /mock-data.ts
  /visa-direct-config.ts
  /env.ts
  /constants.ts
  /api
    /visa-direct.ts                 — Visa Direct API client (stubbed Phase 1-2)
    /fireblocks.ts                  — Fireblocks API client (Phase 3)
    /payload-mapper.ts              — maps Visa Direct → Fireblocks
/app/api
  /payout/route.ts                  — Phase 3
  /transactions/route.ts            — Phase 4
app.config.ts
next.config.ts
middleware.ts
tsconfig.json
package.json
postcss.config.mjs
eslint.config.mjs

## Phase 1 core screen: payment-methods-screen.tsx

Page heading: "Payout methods"
Subheading: "Choose how you'd like to receive your Airbnb earnings"

Three payout method cards (payout-method-card.tsx) displayed as a vertical list.
All three look fully active and real — no disabled or greyed-out states.

### Card 1 — Push to account
- Icon: Building2
- Title: "Bank account"
- Description: "Chase Bank ****4521 — Checking"
- Badge: "Default" (coral/primary background) — this is the current default
- Detail row: "Routing ****021" — "Typically 1–2 business days"
- Action: "Set as default" button — hidden when already default
- Source: MOCK_BANK_ACCOUNT

### Card 2 — Push to wallet
- Icon: Wallet
- Title: "Crypto wallet"
- Description: "Receive USDC directly to your crypto wallet"
- Badge: none initially
- In Phase 1: show two sub-option cards (wallet-option-card.tsx):
  a. "Connect your CeFi wallet"
     - Description: "Link your Kraken account"
     - Icon: Link2
     - CTA: "Connect wallet" — disabled in Phase 1, tooltip "Coming in Phase 2"
     - Phase 2: real Dynamic CeFi connector — OAuth into Kraken via
       `authenticateWithSocial({ provider: "kraken" })`, pull balances via
       `getKrakenAccounts()`, then collect the user's Kraken USDC deposit
       address and do a name match against the Dynamic host profile.
  b. "Create a wallet"
     - Description: "Get a Fireblocks-secured embedded wallet in seconds"
     - Icon: Plus
     - CTA: "Create wallet" — disabled in Phase 1, tooltip "Coming in Phase 2"
- In Phase 2+: after wallet setup, replace sub-options with wallet address display
  and "Set as default" button
- When set as default: card shows "Default" badge, bank account card loses it

### Card 3 — Push to card
- Icon: CreditCard
- Title: "Debit card"
- Description: "Visa ****8823 — expires 09/27"
- Badge: "Configured" (neutral blue — #DBEAFE / #1D4ED8)
- Detail row: "Instant payout — fee may apply"
- Action: "Set as default" button
- Source: MOCK_CARD

### Default payment method state machine
- Stored in React state as: defaultMethod: "bank" | "wallet" | "card"
- Initial state: "bank"
- "Set as default" button appears on all cards that are NOT the current default
- Clicking it updates defaultMethod, re-renders all three badges accordingly
- Phase 2: persist to Dynamic user metadata

### Demo payment button
- Fixed position: bottom-right corner, z-index above content
- Style: coral filled (#FF5A5F), white Zap icon, label "Simulate payout"
- Always visible on every page inside (app) layout
- Phase 1: clicking opens payout-modal.tsx which shows:
  - Amount input (USD)
  - Selected payout method summary (reads from defaultMethod state)
  - "Send payout" button — disabled, tooltip: "Will trigger live flow in Phase 3"
  - Modal close button
- Phase 3: fully wired to POST /api/payout

## Visa Direct → Fireblocks payload mapping (lib/api/payload-mapper.ts)
Document with clear JSDoc comments — this is a key demo talking point for Visa.

Visa Direct sendPayout field                  → Fireblocks createTransaction field
recipientDetail.firstName + lastName          → note (name match display)
recipientDetail.cryptoWallet.address          → destination.oneTimeAddress.address
recipientDetail.cryptoWallet.blockchain       → assetId prefix:
                                                 Ethereum → USDC_ETH
                                                 Solana   → USDC_SOL
recipientDetail.cryptoWallet.asset            → assetId
transactionDetail.amount                      → amount
senderDetail.senderReferenceNumber            → externalTxId
clientReferenceId                             → customerRefId

Fireblocks createTransaction source:
  type: "VAULT_ACCOUNT"
  id: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID   (MTLco sub-account)

## Visa Direct API stub (lib/api/visa-direct.ts)
Phase 1-2: all methods return mock responses after 1500ms delay.
Phase 3: real calls to VISA_DIRECT_BASE_URL with VISA_DIRECT_API_KEY.

sendPayout mock response:
{
  transactionId: "VD-" + Date.now(),
  status: "EXECUTION_COMPLETED",
  subStatus: "PAYOUT_COMPLETED",
  amount: <input amount>,
  asset: "USDC",
  blockchain: "Ethereum",
  recipientWallet: <wallet address>,
  timestamp: new Date().toISOString()
}

## Mock data (lib/mock-data.ts)
All typed TypeScript constants. Never hardcode in components.

MOCK_HOST:
  name: "Sarah Chen", email: "sarah.chen@example.com"
  hostSince: "2019", totalEarnings: 48250
  pendingPayout: 1840, currency: "USD"

MOCK_PENDING_PAYOUT:
  id: "PAY-2025-0041", amount: 1840, currency: "USD"
  description: "April earnings — 3 stays", dueDate: "2025-04-20"

MOCK_BANK_ACCOUNT:
  bank: "Chase Bank", accountMasked: "****4521"
  routingMasked: "****021", type: "Checking", isDefault: true

MOCK_CARD:
  network: "Visa", cardMasked: "****8823"
  expiry: "09/27", type: "Debit", isDefault: false

MOCK_TRANSACTIONS: array of 2 entries —
  TXN-001: visaDirectTxId VD-1713000001, amount 1200 USDC, Ethereum,
    EXECUTION_COMPLETED / PAYOUT_COMPLETED, wallet 0xAB...1234,
    2025-04-01T10:00:00Z, fireblocksId fb-tx-aaa111
  TXN-002: visaDirectTxId VD-1713000002, amount 980 USDC, Ethereum,
    EXECUTION_FAILED / WALLET_NOT_VERIFIED, wallet 0xCD...5678,
    2025-03-15T14:30:00Z, fireblocksId fb-tx-bbb222

MOCK_VISA_PAYLOAD_TEMPLATE: full sendPayout request object per Visa Direct POC
  API schema — recipientDetail (Sarah Chen, Ethereum wallet), senderDetail
  (Airbnb Inc), transactionDetail (amount 1840, currency USD, payoutMethod "CW")

## Status badge variants
EXECUTION_COMPLETED / PAYOUT_COMPLETED → green  #D1FAE5 / #059669  "Completed"
EXECUTION_PENDING                      → yellow #FEF3C7 / #92600A  "Pending"
EXECUTION_FAILED                       → red    #FEE2E2 / #C13515  "Failed"
EXECUTION_REJECTED                     → orange #FFEDD5 / #C2410C  "Rejected"
Font: 600 11px, rounded-full, px-2.5 py-0.5

## Code rules
- Build only the current phase — no speculative features
- TypeScript strict — zero errors, zero warnings
- One component per file
- Sentence case everywhere in UI text
- No lorem ipsum — always use mock-data.ts
- No hardcoded data or colors in components
- pnpm only — never npm or yarn
- Server secrets in API routes only — never in client components
- Use --widget-* CSS vars throughout — never hardcode hex colors in components
