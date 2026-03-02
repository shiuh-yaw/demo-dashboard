# Earn Dashboard Demo

A demo application showcasing Dynamic embedded wallets for creator payout flows using USDC on Base Sepolia.

## Overview

This demo showcases an Earn Dashboard to demonstrate:
- Receiving payments in USDC (mocked or real)
- Adding funds to a payment card (Rain - UI only)
- Off-ramp solution using BlindPay
- Admin depositing funds to creators
- Depositing earn yield

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with customizable theme system
- **Dynamic SDK** - Google OAuth authentication and embedded wallet management
- **Base Sepolia** - Testnet blockchain network

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Dynamic Environment ID (from [Dynamic Dashboard](https://app.dynamic.xyz))

### Dynamic Dashboard: Enable networks

**Required to avoid "No networks were registered in the client".**

Networks are configured in the Dynamic Dashboard, not in code. You must enable the chains/networks your app uses:

1. Open [Chains & Networks](https://app.dynamic.xyz/dashboard/chains-and-networks) in the Dynamic Dashboard.
2. Enable **EVM** and **Base Sepolia** (or add Base Sepolia as a custom EVM network).
3. Enable **ZeroDev** under Account Abstraction if you use gasless minting.
4. Save. The client loads these settings when it initializes.

If Base Sepolia is not in the default list, add it as a custom EVM network (chain ID `84532`, RPC e.g. `https://sepolia.base.org`).

### Installation

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Copy `.example.env` to `.env.local`:
```bash
cp .example.env .env.local
```

3. Add your Dynamic Environment ID to `.env.local`:
```env
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your-environment-id-here
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

4. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication

The app uses Dynamic's Google OAuth authentication:
- Users sign in with their Google account
- An EVM embedded wallet is automatically created on Base Sepolia
- Wallet address is available throughout the app

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (dashboard)/  # Default dashboard routes
│   ├── e/[id]/       # Config-driven dashboard routes
│   └── layout.tsx    # Root layout
├── components/       # React components
│   └── sidebar.tsx   # Sidebar navigation (optional via config)
├── contexts/         # React context providers
│   └── earn-config-context.tsx  # Theme/branding config
├── lib/              # Utilities and configurations
│   ├── dynamic.ts    # Dynamic SDK setup
│   ├── earn-config.ts # Earn config types and fetching
│   └── api.ts        # API client for demo-dashboard backend
└── data/             # Mock data
    └── mock-earn-data.json
```

## Features

### Phase 1: BlindPay API Integration ✅
- Standardized BlindPay API routes in `demo-dashboard`
- Payout and payin flows
- Exchange rates API
- Documentation page

### Phase 2: Earn Dashboard App Setup ✅
- Next.js 15 app structure
- Customizable theme system (colors, typography)
- Dynamic SDK integration with Google auth
- Auto wallet creation on login
- Sidebar navigation

### Phase 3: Earn Tab UI (In Progress)
- Balance display
- Recent payments
- Transaction history
- Yield deposit section
- Payment card (Rain - stubbed)

### Phase 4: Dynamic Embedded Wallets Integration (Pending)
- Wallet connection UI
- Balance fetching
- Transaction signing

### Phase 5: Mock Payment System (Pending)
- Payment simulation
- Admin deposit flow

## Design System

The app uses a customizable theme system via Earn Configs:
- **Primary Color**: Configurable (default: Dynamic blue)
- **Accent Color**: Configurable highlight color
- **Background**: `#F9F9F9` (Light gray)
- **Dark Background**: `#282828`
- **Text Primary**: `#030303`
- **Text Secondary**: `#606060`
- **Border Radius**: Configurable (xs, sm, md, lg)

Themes are managed through the `demo-dashboard` project and applied via `/e/[configId]` routes.

## API Integration

The app connects to `demo-dashboard` backend APIs:
- BlindPay payout/payin flows
- Payment simulation (for admin deposits)
- Exchange rates

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to point to your backend.

## Development

### Adding New Features

1. Create components in `src/components/`
2. Add pages in `src/app/`
3. Use mock data from `src/data/mock-earn-data.json`
4. Connect to APIs via `src/lib/api.ts`

### Mock Data

Mock data is stored in `src/data/mock-earn-data.json` and includes:
- Balance (USDC and pending)
- Recent payments
- Transaction history
- Yield opportunities
- Payment card data

## License

Private - Demo purposes only

