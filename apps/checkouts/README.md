# Payment Widget

A customizable payment/deposit widget built with Next.js and the Dynamic SDK. Supports multi-chain deposits, token swaps via LI.FI, and connects to external wallets (MetaMask, Phantom, etc.) or embedded wallets.

## Features

| Feature                  | Description                                     |
| ------------------------ | ----------------------------------------------- |
| 💳 **Payment Mode**      | Fixed amount checkout (e.g., $50 for a product) |
| 💰 **Deposit Mode**      | User-selected amount deposits                   |
| 🔗 **Multi-Chain**       | Ethereum, Base, Polygon, Solana support         |
| 🔄 **Cross-Chain Swaps** | LI.FI integration for any-to-any token swaps    |
| 👛 **External Wallets**  | MetaMask, Coinbase Wallet, Phantom, etc.        |
| 🏠 **Embedded Wallets**  | Dynamic-managed wallets with email login        |
| 🎨 **Theming**           | Customizable colors, logos, and branding        |
| ⚡ **Live Preview**      | Real-time config updates from dashboard         |

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Add your Dynamic environment ID to .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the widget.

## Environment Variables

```env
# Required: Dynamic Labs Environment ID
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_environment_id

# Optional: Dashboard API URL (defaults to http://localhost:4000)
# NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:4000
```

## Project Structure

```text
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── (widget)/               # Widget routes
│   │   ├── page.tsx            # Demo widget page
│   │   ├── preview/
│   │   │   └── page.tsx        # Live preview (receives config via postMessage)
│   │   └── w/[id]/
│   │       ├── page.tsx        # Production widget by ID
│   │       └── wallet/
│   │           └── page.tsx    # Embedded wallet view
│   └── globals.css             # Global styles
│
├── components/
│   ├── payment-widget/         # Main widget component
│   │   ├── index.tsx           # PaymentWidget entry point
│   │   └── utils.ts            # Widget utilities
│   ├── payment-modal/          # Modal screens
│   │   ├── asset-row.tsx
│   │   ├── asset-selector-screen.tsx
│   │   ├── connected-wallets-screen.tsx
│   │   ├── deposit-amount-screen.tsx
│   │   ├── wallet-row.tsx
│   │   └── wallet-selector-screen.tsx
│   ├── widget-layout.tsx       # Shared layout for widget pages
│   └── ui/                     # Reusable UI components
│
├── hooks/
│   └── use-lifi/               # LI.FI swap integration
│       ├── index.ts            # Main hook
│       ├── utils.ts            # SDK configuration
│       ├── evm.ts              # EVM provider & transfers
│       └── solana.ts           # Solana provider & transfers
│
├── lib/
│   ├── actions/
│   │   └── lifi.ts             # LI.FI API client (via dashboard proxy)
│   ├── api/
│   │   └── widgets.ts          # Widget config API client
│   ├── balance-utils.ts        # Token balance utilities
│   ├── config.ts               # App constants
│   ├── dynamicClient.ts        # Dynamic SDK client
│   ├── env.ts                  # Environment validation
│   ├── format.ts               # Number/string formatting
│   ├── providers.tsx           # App providers
│   ├── types.ts                # Type definitions
│   ├── utils.ts                # Utility functions
│   └── widget-config.ts        # Widget config types & defaults
```

## How It Works

### Widget Flow

```text
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Select Wallet  │ ──▶  │  Select Token   │ ──▶  │  Confirm Swap   │
│  (or connect)   │      │  & Amount       │      │  & Execute      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

1. **Wallet Selection** - Connect external wallet or use embedded wallet
2. **Token Selection** - Choose which token to pay with
3. **Quote** - Get swap route via dashboard API (LI.FI)
4. **Execute** - Sign and execute the swap transaction

### Dashboard Integration

The widget fetches configuration and swap routes from the `demo-dashboard` API:

| Endpoint                 | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `GET /api/widgets/[id]`  | Fetch widget config (public)             |
| `POST /api/swaps/routes` | Get swap quote (authenticated)           |
| `GET /api/swaps/status`  | Check cross-chain status (authenticated) |

The dashboard controls the LI.FI integrator and fee settings server-side.

### Live Preview

The `/preview` route receives configuration updates via `postMessage` for real-time editing in the dashboard.

## Widget Modes

### Payment Mode

Fixed amount checkout for products/services:

```typescript
const config: WidgetConfig = {
  mode: "payment",
  paymentPage: {
    logoUrl: "/product.png",
    productTitle: "Premium Plan",
    productDescription: "Monthly subscription",
  },
  transaction: {
    amount: "50.00",
    currency: "USD",
  },
};
```

### Deposit Mode

User-selected amount for deposits:

```typescript
const config: WidgetConfig = {
  mode: "deposit",
  deposit: {
    destination: "embedded", // or fixed address
    allowedTokens: [{ symbol: "USDC", chainId: 8453 }],
  },
};
```

## Theming

Customize the widget appearance:

```typescript
const theme: WidgetTheme = {
  primaryButtonColor: "#4779FF",
  primaryHoverColor: "#3a6ae8",
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  borderRadius: "lg",
  gradientFrom: "#f8f9ff",
  gradientTo: "#ffffff",
};
```

## Tech Stack

- **[Next.js 15](https://nextjs.org/)** - React framework
- **[Dynamic SDK](https://www.dynamic.xyz/)** - Wallet authentication
- **[LI.FI SDK](https://docs.li.fi/)** - Cross-chain swaps
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[viem](https://viem.sh/)** - Ethereum utilities

## Related

- **demo-dashboard** - Dashboard for managing widget configurations
- [Dynamic Documentation](https://www.dynamic.xyz/docs)
- [LI.FI Documentation](https://docs.li.fi/)
