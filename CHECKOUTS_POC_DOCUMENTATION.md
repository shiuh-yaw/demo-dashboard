# Checkouts POC - Engineering Documentation

This document provides comprehensive technical documentation for the Checkouts Proof of Concept (POC), covering the three main components: the UI widget, the API layer, and the dashboard.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [UI Code - Payment Widget](#ui-code---payment-widget)
3. [API Layer - Checkouts API](#api-layer---checkouts-api)
4. [Dashboard - Checkout Management](#dashboard---checkout-management)
5. [Data Flow](#data-flow)
6. [Transaction Lifecycle](#transaction-lifecycle)

---

## Architecture Overview

The Checkouts POC consists of three interconnected components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Widget (UI)                      │
│  examples/examples/nextjs-payment-widget                    │
│  - Embedded checkout widget                                 │
│  - Wallet connection (Dynamic SDK)                          │
│  - Token swaps via LI.FI                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP API Calls
                       │ (Config, Transactions, Quotes)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Dashboard API (Backend)                        │
│  demo-dashboard/src/app/api/checkouts                       │
│  - Checkout configuration management                        │
│  - Transaction lifecycle management                         │
│  - LI.FI integration                                        │
│  - Redis storage                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ Server Actions / API Routes
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Dashboard UI (Management)                         │
│  demo-dashboard/src/app/checkouts                           │
│  - Checkout creation & editing                              │
│  - Transaction monitoring                                   │
│  - Analytics & stats                                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Technologies

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Redis (Upstash)
- **Wallet SDK**: Dynamic Labs SDK
- **Cross-Chain Swaps**: LI.FI SDK
- **Authentication**: Dynamic JWT
- **Background Jobs**: Upstash QStash

---

## UI Code - Payment Widget

**Location**: `examples/examples/nextjs-payment-widget`

### Overview

The payment widget is a standalone Next.js application that renders embeddable checkout widgets. It handles wallet connections, token selection, swap quotes, and transaction execution.

### Project Structure

```
nextjs-payment-widget/
├── app/
│   ├── layout.tsx                    # Root layout with Dynamic providers
│   ├── (widget)/
│   │   ├── page.tsx                  # Demo widget page
│   │   ├── preview/
│   │   │   └── page.tsx              # Live preview (postMessage updates)
│   │   └── w/[id]/
│   │       ├── page.tsx              # Production widget by ID
│   │       └── wallet/
│   │           └── page.tsx          # Embedded wallet view
│
├── components/
│   ├── payment-widget/               # Main widget component
│   │   ├── index.tsx                 # PaymentWidget entry point
│   │   ├── screens/                  # Modal screens
│   │   │   ├── completion-screen.tsx
│   │   │   ├── pending-screen.tsx
│   │   │   └── ...
│   │   └── utils.ts
│   ├── payment-modal/                # Modal components
│   └── widget-layout.tsx             # Shared layout wrapper
│
├── hooks/
│   └── use-lifi/                     # LI.FI swap integration
│       ├── index.ts                  # Main hook
│       ├── evm.ts                    # EVM provider & transfers
│       └── solana.ts                 # Solana provider & transfers
│
└── lib/
    ├── api/
    │   ├── checkouts.ts              # Fetch checkout config
    │   ├── transactions.ts           # Transaction lifecycle API
    │   ├── client.ts                 # Authenticated API client
    │   └── server-client.ts          # Server-side API client
    ├── dynamicClient.ts              # Dynamic SDK initialization
    └── widget-config.ts              # Config types & defaults
```

### Key Components

#### PaymentWidget (`components/payment-widget/index.tsx`)

The main widget component that orchestrates the checkout flow:

- **Props**:
  - `checkoutId`: Checkout configuration ID
  - `config`: Widget configuration (theme, branding, etc.)
  - `transaction`: Transaction parameters (amount, externalId, metadata)
  - `initialTransaction`: Existing transaction to resume

- **Flow**:
  1. Initialize transaction via API (captures externalId/metadata)
  2. Connect wallet (Dynamic SDK)
  3. Select token and amount
  4. Fetch swap quote from dashboard API
  5. Execute swap transaction
  6. Submit transaction hash to API
  7. Monitor transaction status

#### Widget Routes

**`/w/[id]`** - Production widget route
- Fetches checkout config server-side
- Parses transaction params from URL (`externalId`, `metadata`)
- Checks for existing transaction by `externalId`
- Renders appropriate screen (completion, pending, or payment widget)

**`/preview`** - Live preview route
- Receives config updates via `postMessage` from dashboard
- Enables real-time preview during editing

### API Integration

The widget communicates with the dashboard API through two clients:

#### Client-Side API (`lib/api/client.ts`)

For authenticated requests (transaction operations):
- Uses Dynamic JWT token from `useDynamicContext()`
- Handles authentication headers automatically
- Used for: transaction updates, quotes, submission

#### Server-Side API (`lib/api/server-client.ts`)

For public requests (config fetching):
- No authentication required
- Used in server components
- Used for: fetching checkout config

### Transaction Flow

```typescript
// 1. Initialize transaction
const { data: transaction } = await initializeTransaction(checkoutId, {
  externalId: "order-123",
  metadata: { customerId: "456" }
});

// 2. Get swap quote
const quote = await getTransactionQuote(checkoutId, transaction.id, {
  fromChainId: 1,
  toChainId: 8453,
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  fromAmount: "1000000000000000000",
  fromAddress: walletAddress,
  toAddress: destinationAddress
});

// 3. Update transaction with route data
await updateTransaction(checkoutId, transaction.id, {
  walletAddress,
  fromToken: quote.route.fromToken,
  toToken: quote.route.toToken,
  fromAmount: quote.route.fromAmount,
  toAmount: quote.route.toAmount
});

// 4. Execute swap (LI.FI SDK)
const txHash = await executeSwap(quote.route);

// 5. Submit transaction
await submitTransaction(checkoutId, transaction.id, txHash);
```

### LI.FI Integration

The widget uses LI.FI SDK for cross-chain swaps:

- **Hook**: `hooks/use-lifi/index.ts`
- **Features**:
  - Multi-chain support (EVM + Solana)
  - Token balance fetching
  - Swap quote fetching
  - Transaction execution
  - Status monitoring

### Environment Variables

```env
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_environment_id
NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:3001  # Optional, defaults to localhost:3001
```

---

## API Layer - Checkouts API

**Location**: `demo-dashboard/src/app/api/checkouts`

### Overview

The Checkouts API provides RESTful endpoints for managing checkout configurations and transaction lifecycle. It handles authentication, data persistence (Redis), and integration with LI.FI for swap quotes.

### API Structure

```
api/checkouts/
├── [id]/
│   ├── route.ts                      # GET checkout config (public)
│   ├── stats/
│   │   └── route.ts                  # GET checkout statistics
│   ├── transactions/
│   │   ├── route.ts                  # POST create, GET list
│   │   └── [txId]/
│   │       ├── route.ts              # GET, PATCH transaction
│   │       ├── quote/
│   │       │   └── route.ts          # POST get LI.FI quote
│   │       ├── submit/
│   │       │   └── route.ts          # POST submit txHash
│   │       └── status/
│   │           └── route.ts          # GET, PATCH status
│   └── users/
│       └── route.ts                  # GET list users
│
└── handlers/
    ├── get-checkout.ts               # Get checkout config
    ├── create-transaction.ts         # Initialize transaction
    ├── get-transaction-quote.ts      # Fetch LI.FI quote
    ├── submit-transaction.ts         # Submit transaction
    ├── update-transaction-status.ts  # Update status
    └── ...
```

### API Endpoints

#### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/checkouts/[id]` | Get checkout configuration |
| POST | `/api/checkouts/[id]/transactions` | Initialize transaction |
| GET | `/api/checkouts/[id]/transactions/[txId]/status` | Get transaction status |

#### Authenticated Endpoints (Bearer Token Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/checkouts/[id]/transactions` | List transactions (paginated) |
| GET | `/api/checkouts/[id]/transactions/[txId]` | Get transaction details |
| PATCH | `/api/checkouts/[id]/transactions/[txId]` | Update transaction |
| POST | `/api/checkouts/[id]/transactions/[txId]/quote` | Get swap quote |
| POST | `/api/checkouts/[id]/transactions/[txId]/submit` | Submit transaction |
| PATCH | `/api/checkouts/[id]/transactions/[txId]/status` | Update transaction status |
| GET | `/api/checkouts/[id]/users` | List users |
| GET | `/api/checkouts/[id]/stats` | Get checkout statistics |

### API Call Flows

#### Get Checkout Configuration

**Flow**: Widget → API Route → Handler → CheckoutService → Redis

1. Widget sends `GET /api/checkouts/[id]` (no auth required)
2. API route calls `handleGetCheckout()` handler
3. Handler calls `checkoutService.get()` to fetch from Redis
4. Handler removes `ownerId` for security
5. Returns checkout config to widget

#### Initialize Transaction

**Flow**: Widget → API Route → Handler → CheckoutService/TxService → Redis

1. Widget sends `POST /api/checkouts/[id]/transactions` with `externalId` and `metadata` (no auth required)
2. Handler validates checkout exists
3. If `externalId` provided, checks for existing transaction
4. Creates new transaction with status `initialized` in Redis
5. Returns transaction with `created` flag (true if new, false if existing)

#### Get Transaction Quote

**Flow**: Widget → API Route → Handler → TxService → LiFiService → LI.FI API → Redis

1. Widget sends `POST /api/checkouts/[id]/transactions/[txId]/quote` with swap parameters (auth required)
2. Handler validates transaction exists and status is mutable
3. Handler calls `lifiService.getRoutes()` which queries LI.FI API
4. Handler extracts best route (first route from LI.FI response)
5. Handler calls `transactionService.addRouteData()` to store route in Redis
6. Transaction status updated to `draft`
7. Returns quote and updated transaction

#### Submit Transaction

**Flow**: Widget → API Route → Handler → TxService → UserService → CheckoutService → QStash → Redis

1. Widget sends `POST /api/checkouts/[id]/transactions/[txId]/submit` with `txHash` (auth required)
2. Handler validates transaction exists
3. Handler calls `transactionService.submit()` to update status to `submitted` and store `txHash`
4. Handler updates user stats (non-critical, errors ignored)
5. Handler invalidates checkout stats cache
6. Handler enqueues background monitoring job via QStash
7. Returns transaction and `monitorId`

#### Get Transaction Status

**Flow**: Widget → API Route → Handler → TxService → Redis

1. Widget sends `GET /api/checkouts/[id]/transactions/[txId]/status` (no auth required)
2. Handler fetches transaction from Redis
3. Handler extracts status fields (id, status, txHash, errorMessage, timestamps)
4. Returns minimal status information

#### List Transactions (Dashboard)

**Flow**: Dashboard → API Route → Handler → TxService → Redis

1. Dashboard sends `GET /api/checkouts/[id]/transactions` with pagination/filter params (auth required)
2. Handler calls `transactionService.list()` with filters
3. Service queries Redis with filters and pagination
4. Returns paginated transaction list with total count

#### Get Checkout Statistics

**Flow**: Dashboard → API Route → Handler → CheckoutService → TxService/UserService → Redis

1. Dashboard sends `GET /api/checkouts/[id]/stats` (auth required)
2. Handler calls `checkoutService.getStats()`
3. Service checks Redis cache first
4. If cache miss: fetches all transactions and users, calculates stats, caches result
5. Returns statistics (totalTransactions, transactionsByStatus, totalUsers, successRate, avgCompletionTimeSeconds)

### Request/Response Examples

#### Get Checkout Config

```http
GET /api/checkouts/abc123
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "My Checkout",
    "mode": "payment",
    "config": {
      "theme": { ... },
      "branding": { ... },
      "depositDestination": "embedded",
      "settlement": { ... }
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Create Transaction

```http
POST /api/checkouts/abc123/transactions
Content-Type: application/json

{
  "externalId": "order-456",
  "metadata": {
    "customerId": "789"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "tx-123",
      "checkoutId": "abc123",
      "status": "initialized",
      "externalId": "order-456",
      "metadata": { "customerId": "789" },
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "created": true
  }
}
```

#### Get Transaction Quote

```http
POST /api/checkouts/abc123/transactions/tx-123/quote
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "fromChainId": 1,
  "toChainId": 8453,
  "fromTokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "toTokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "fromAmount": "1000000000",
  "fromAddress": "0x...",
  "toAddress": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "quote": {
      "route": {
        "id": "route-123",
        "fromChainId": 1,
        "toChainId": 8453,
        "fromToken": { ... },
        "toToken": { ... },
        "fromAmount": "1000000000",
        "toAmount": "999500000",
        "steps": [ ... ]
      },
      "integrator": "dynamic"
    },
    "transaction": {
      "id": "tx-123",
      "status": "draft",
      "routeData": { ... }
    }
  }
}
```

#### Submit Transaction

```http
POST /api/checkouts/abc123/transactions/tx-123/submit
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "txHash": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "tx-123",
      "status": "submitted",
      "txHash": "0x...",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    "monitorId": "msg-456"
  }
}
```

### Handlers

#### `get-checkout.ts`

Fetches checkout configuration from Redis. Supports demo/preview checkouts.

**Key Logic**:
- Validates checkout ID
- Fetches from Redis
- Returns config (excluding `ownerId` for security)

#### `create-transaction.ts`

Initializes a new transaction or returns existing one by `externalId`.

**Key Logic**:
- Validates checkout exists
- Checks for duplicate `externalId`
- Creates transaction with status `initialized`
- Returns transaction + `created` flag

#### `get-transaction-quote.ts`

Fetches swap quote from LI.FI and stores route data in transaction.

**Key Logic**:
- Validates transaction exists and belongs to checkout
- Prevents updates to immutable statuses (submitted/pending/confirmed)
- Calls LI.FI service for routes
- Stores route data atomically in transaction
- Updates status to `draft`

#### `submit-transaction.ts`

Submits transaction with blockchain txHash and triggers monitoring.

**Key Logic**:
- Validates transaction exists
- Updates status to `submitted`
- Stores txHash
- Updates user stats (non-critical)
- Invalidates checkout stats cache
- Enqueues background monitoring job (QStash)

### Services

The API uses service layer abstractions:

- **`checkoutService`**: Checkout CRUD operations
- **`transactionService`**: Transaction lifecycle management
- **`userService`**: User statistics tracking
- **`lifiService`**: LI.FI API integration

All services use Redis for persistence (via `RedisCheckoutService`, `RedisTransactionService`, etc.).

### Authentication

- **Public endpoints**: No authentication required (CORS enabled)
- **Authenticated endpoints**: Bearer token (Dynamic JWT)
- **Middleware**: `withAuth` wrapper validates JWT and extracts user info

### Error Handling

All endpoints use `handleApiError` utility:
- Standardizes error responses
- Logs errors with context
- Returns appropriate HTTP status codes
- Handles known error types (`NotFoundError`, `ConflictError`, etc.)

---

## Dashboard - Checkout Management

**Location**: `demo-dashboard/src/app/checkouts`

### Overview

The dashboard provides a web interface for creating, editing, and managing checkout configurations. It includes transaction monitoring, analytics, and user management.

### Project Structure

```
app/checkouts/
├── page.tsx                          # List all checkouts (server component)
├── new/
│   └── page.tsx                      # Create new checkout
├── [id]/
│   ├── layout.tsx                    # Checkout detail layout
│   ├── page.tsx                      # Overview tab (server component)
│   ├── settings/
│   │   ├── page.tsx                  # Settings tab
│   │   └── settings-client.tsx       # Settings UI
│   ├── transactions/
│   │   ├── page.tsx                  # Transactions list
│   │   └── [txId]/
│   │       └── page.tsx              # Transaction detail
│   └── users/
│       └── page.tsx                  # Users list
│
├── components/
│   ├── checkouts-client.tsx          # Checkouts list UI
│   ├── editor/
│   │   ├── config-editor-client.tsx  # Main editor component
│   │   ├── basic-settings.tsx        # Basic config form
│   │   ├── appearance-settings.tsx   # Theme customization
│   │   ├── product-settings.tsx      # Product/branding settings
│   │   ├── widget-preview.tsx        # Live preview iframe
│   │   └── ...
│   └── management/
│       ├── checkout-header.tsx       # Header with tabs
│       ├── checkout-tabs.tsx         # Tab navigation
│       ├── overview-tab.tsx          # Stats & recent transactions
│       ├── transactions-tab.tsx      # Full transactions table
│       └── users-tab.tsx             # Users list
│
└── hooks/
    └── use-checkout-config.ts        # Config state management
```

### Key Pages

#### Checkouts List (`page.tsx`)

Server component that fetches all checkouts and passes to client component.

**Features**:
- Lists user's checkouts
- Shows orphaned checkouts (no owner)
- Filter toggle (My / Unclaimed)
- Create new checkout button
- Delete checkout (with confirmation)

#### Checkout Detail (`[id]/page.tsx`)

Overview page showing stats and recent transactions.

**Features**:
- Transaction statistics (total, by status, success rate)
- Recent transactions list
- Quick actions

#### Checkout Editor (`[id]/settings/page.tsx`)

Full-featured editor for checkout configuration.

**Features**:
- Basic settings (mode, deposit destination, settlement)
- Product settings (logo, title, description)
- Appearance settings (theme, colors, border radius)
- Live preview (iframe with postMessage)
- AI style import (extract colors/logo from URL)
- Save/unsaved changes tracking

### Components

#### `checkouts-client.tsx`

Client component for checkout list management.

**State**:
- `checkouts`: User's checkouts
- `orphanedCheckouts`: Unclaimed checkouts
- `filter`: "my" | "unclaimed"
- `showDeleteModal`: Delete confirmation state

**Actions**:
- Create checkout (navigate to `/checkouts/new`)
- Delete checkout (with confirmation)
- Navigate to checkout detail

#### `config-editor-client.tsx`

Main editor component with two-column layout (editor + preview).

**Features**:
- Form state management via `use-checkout-config` hook
- Unsaved changes tracking
- Save functionality (exposed via ref for parent)
- Error handling
- Toast notifications

**Layout**:
- Left: Editor forms (Basic, Product, Appearance)
- Right: Live preview iframe

#### `widget-preview.tsx`

Live preview component that embeds widget in iframe.

**Features**:
- Sends config updates via `postMessage`
- Updates preview in real-time as user edits
- Handles preview route (`/preview`)

### Hooks

#### `use-checkout-config.ts`

Custom hook for managing checkout configuration state.

**Features**:
- Loads initial config from server
- Tracks unsaved changes
- Handles save operation
- Updates config sections (theme, branding, payment page)
- Error handling
- Toast notifications

**API**:
```typescript
const {
  storedConfig,        // Saved config from server
  config,              // Current working config
  name,                // Checkout name
  isSaving,            // Save in progress
  hasUnsavedChanges,   // Dirty state
  setConfig,           // Update entire config
  setName,             // Update name
  handleSave,          // Save to server
  updateTheme,         // Update theme section
  updateBranding,      // Update branding section
  updatePaymentPage,   // Update payment page section
} = useCheckoutConfig({ id, isNewCheckout, initialConfig });
```

### Transaction Management

#### Transactions Tab (`transactions-tab.tsx`)

Full-featured transactions table with filtering and pagination.

**Features**:
- Pagination (server-side)
- Status filtering
- Wallet address filtering
- External ID filtering
- Sort by date
- Transaction detail modal
- Status badges
- Explorer links

#### Transaction Detail (`[txId]/page.tsx`)

Detailed view of a single transaction.

**Shows**:
- Transaction status
- Route information (from/to tokens, amounts)
- Transaction hash (with explorer link)
- Timestamps (created, updated, completed)
- Error messages (if failed)
- User wallet address

### User Management

#### Users Tab (`users-tab.tsx`)

Lists users who have interacted with the checkout.

**Shows**:
- Wallet address
- Chain ID
- Transaction count
- First seen / Last seen dates
- Total volume (if available)

### Server Actions

The dashboard uses Next.js Server Actions for mutations:

- **`lib/actions/checkouts.ts`**:
  - `getAllCheckoutConfigs()`: Fetch all checkouts
  - `getCheckoutConfig(id)`: Fetch single checkout
  - `createCheckout(config)`: Create new checkout
  - `updateCheckout(id, config)`: Update checkout
  - `deleteCheckout(id)`: Delete checkout

All actions interact with Redis via service layer.

---

## Data Flow

For detailed API call flows with swimlane diagrams, see the [API Call Flows (Swimlanes)](#api-call-flows-swimlanes) section above.

### High-Level Transaction Flow

The complete transaction flow involves multiple API calls:

1. **Get Checkout Config** - Widget fetches configuration (public endpoint)
2. **Initialize Transaction** - Create transaction record (public endpoint)
3. **Get Quote** - Fetch swap route from LI.FI (authenticated endpoint)
4. **Submit Transaction** - Submit blockchain txHash (authenticated endpoint)
5. **Poll Status** - Check transaction status (public endpoint)

See individual API call swimlanes in the [API Layer](#api-layer---checkouts-api) section for detailed request/response flows.

---

## Transaction Lifecycle

### Status States

Transactions progress through the following states:

1. **`initialized`**: Transaction created, no route selected yet
2. **`draft`**: Route selected, transaction ready to execute
3. **`submitted`**: Transaction hash submitted, awaiting confirmation
4. **`pending`**: Transaction confirmed on source chain, awaiting destination
5. **`confirmed`**: Transaction completed successfully
6. **`failed`**: Transaction failed (user cancelled, error, etc.)
7. **`expired`**: Transaction expired (route expired, etc.)
8. **`abandoned`**: User abandoned transaction
9. **`cancelled`**: Transaction cancelled by user

### Status Transitions

Transactions progress through the following status transitions:

- **`[*]` → `initialized`**: Transaction created via `POST /api/checkouts/[id]/transactions`
- **`initialized` → `draft`**: Route selected via `POST /api/checkouts/[id]/transactions/[txId]/quote`
- **`initialized` → `failed`**: Error occurred
- **`initialized` → `cancelled`**: User cancelled
- **`initialized` → `abandoned`**: User left

- **`draft` → `submitted`**: txHash submitted via `POST /api/checkouts/[id]/transactions/[txId]/submit`
- **`draft` → `initialized`**: User goes back (resets transaction)
- **`draft` → `failed`**: Error occurred
- **`draft` → `cancelled`**: User cancelled
- **`draft` → `abandoned`**: User left

- **`submitted` → `pending`**: Source chain confirmed (background monitor)
- **`submitted` → `failed`**: Transaction failed
- **`submitted` → `expired`**: Route expired

- **`pending` → `confirmed`**: Destination confirmed (background monitor)
- **`pending` → `failed`**: Cross-chain failed
- **`pending` → `expired`**: Timeout

- **`confirmed` → `[*]`**: Transaction complete
- **`failed` → `[*]`**: Terminal state
- **`expired` → `[*]`**: Terminal state
- **`cancelled` → `[*]`**: Terminal state
- **`abandoned` → `[*]`**: Terminal state

### Transaction Lifecycle Transitions

#### Created → Initialized

**Flow**: Widget → API → Handler → TransactionService → Redis

1. Widget calls `POST /api/checkouts/[id]/transactions` with optional `externalId` and `metadata`
2. Handler validates checkout exists
3. Handler calls `transactionService.initialize()` to create transaction in Redis with status `initialized`
4. Returns transaction with `created: true` flag

#### Initialized → Draft (Route Selected)

**Flow**: Widget → API → Handler → TransactionService → LiFiService → LI.FI API → Redis

1. Widget calls `POST /api/checkouts/[id]/transactions/[txId]/quote` with swap parameters (auth required)
2. Handler validates transaction exists and status is mutable
3. Handler calls `lifiService.getRoutes()` which queries LI.FI API
4. Handler extracts best route (first route from LI.FI response)
5. Handler calls `transactionService.addRouteData()` to store route data in Redis
6. Transaction status updated to `draft`
7. Returns quote and updated transaction

#### Draft → Submitted (txHash Submitted)

**Flow**: Widget → LI.FI SDK → Blockchain → API → Handler → TransactionService → UserService → CheckoutService → QStash → Redis

1. Widget executes swap via LI.FI SDK, receives `txHash` from blockchain
2. Widget calls `POST /api/checkouts/[id]/transactions/[txId]/submit` with `txHash` (auth required)
3. Handler validates transaction exists
4. Handler calls `transactionService.submit()` to update status to `submitted` and store `txHash`
5. Handler updates user stats (non-critical)
6. Handler invalidates checkout stats cache
7. Handler enqueues background monitoring job via QStash
8. Returns transaction and `monitorId`

#### Submitted → Pending (Source Chain Confirmed)

**Flow**: QStash → Worker → TransactionService → LiFi API → Redis → QStash

1. QStash triggers monitor worker job
2. Worker fetches transaction from Redis
3. Worker queries LI.FI status API
4. Worker detects source chain confirmed (`sending.status === "DONE"`)
5. Worker calls `transactionService.updateStatus()` to set status to `pending`
6. Worker schedules retry with exponential backoff (30s delay)

#### Pending → Confirmed (Destination Confirmed)

**Flow**: QStash → Worker → TransactionService → CheckoutService → LiFi API → Redis

1. QStash triggers monitor worker job (retry)
2. Worker fetches transaction from Redis
3. Worker queries LI.FI status API
4. Worker detects destination confirmed (`receiving.status === "DONE"`)
5. Worker calls `transactionService.updateStatus()` to set status to `confirmed` with `completedAt`
6. Worker invalidates checkout stats cache
7. Worker completes monitoring (no retry)

#### Any Status → Failed (Error Occurred)

**Flow**: Widget/Worker → API/Worker → Handler → TransactionService → Redis

**User-initiated**:
1. Widget calls `PATCH /api/checkouts/[id]/transactions/[txId]/status` with `status: "failed"` and `errorMessage` (auth required)
2. Handler calls `transactionService.updateStatus()` to set status to `failed`
3. Returns updated transaction

**System-detected**:
1. Worker detects error from LI.FI API or blockchain
2. Worker determines error type (transaction failed, cross-chain failed, etc.)
3. Worker calls `transactionService.updateStatus()` to set status to `failed` with `errorMessage`

#### Draft → Initialized (User Goes Back)

**Flow**: Widget → API → Handler → TransactionService → Redis

1. Widget calls `PATCH /api/checkouts/[id]/transactions/[txId]/status` with `status: "initialized"` (auth required)
2. Handler validates transaction exists
3. Handler calls `transactionService.updateStatus()` to reset status to `initialized` and clear route data
4. Returns updated transaction

#### Any Status → Cancelled/Abandoned (User Action)

**Flow**: Widget → API → Handler → TransactionService → Redis

1. Widget calls `PATCH /api/checkouts/[id]/transactions/[txId]/status` with `status: "cancelled"` or `"abandoned"` (auth required)
2. Handler validates transaction exists
3. Handler calls `transactionService.updateStatus()` to set status
4. Returns updated transaction

#### Status Polling (Widget Checks Status)

**Flow**: Widget → API → Handler → TransactionService → Redis (repeated every 5 seconds)

1. Widget calls `GET /api/checkouts/[id]/transactions/[txId]/status` (no auth required)
2. Handler fetches transaction from Redis
3. Handler extracts status fields (id, status, txHash, errorMessage, timestamps)
4. Returns minimal status information
5. Widget updates UI if status changed to confirmed/pending/failed

### Background Monitoring

When a transaction is submitted, a background job is enqueued (QStash) to monitor its status:

**Flow**: API → QStash → Worker → TransactionService → LiFi API → Redis → QStash (retry loop)

1. **Job Enqueue**: API calls `enqueueTransactionMonitor()` with `txId`, `txHash`, `retryCount: 0`
2. **Worker Trigger**: QStash triggers worker via `POST /api/internal/worker/transaction-monitor`
3. **Status Check**: Worker fetches transaction from Redis, queries LI.FI status API
4. **Status Update**: If status changed, worker updates transaction in Redis and invalidates stats cache
5. **Retry Logic**: If still pending and `retryCount < maxRetries`, worker schedules retry with exponential backoff (30s, 60s, 120s, etc.)
6. **Completion**: If confirmed/failed, worker completes monitoring (no retry)

**Implementation Details**:
1. **Job Enqueue**: `lib/upstash/qstash.ts` → `enqueueTransactionMonitor()`
2. **Handler**: `app/api/internal/worker/transaction-monitor/route.ts`
3. **Logic**:
   - Polls LI.FI status API
   - Updates transaction status in Redis
   - Handles completion, failures, timeouts
   - Retries with exponential backoff (30s, 60s, 120s, etc.)
   - Max retries: 10 (configurable)

**Implementation Details**:
1. **Job Enqueue**: `lib/upstash/qstash.ts` → `enqueueTransactionMonitor()`
2. **Handler**: `app/api/internal/worker/transaction-monitor/route.ts`
3. **Logic**:
   - Polls LI.FI status API
   - Updates transaction status in Redis
   - Handles completion, failures, timeouts
   - Retries with exponential backoff (30s, 60s, 120s, etc.)
   - Max retries: 10 (configurable)

### Transaction Data Model

```typescript
interface Transaction {
  id: string;                    // Unique transaction ID
  checkoutId: string;            // Parent checkout ID
  status: TransactionStatus;     // Current status
  externalId?: string;           // External system identifier
  metadata?: Record<string, any>; // Additional metadata
  
  // Wallet & chain info
  walletAddress?: string;
  fromChainId?: number;
  toChainId?: number;
  
  // Route data (from LI.FI)
  fromToken?: Token;
  toToken?: Token;
  fromAmount?: string;
  toAmount?: string;
  tool?: string;
  
  // Transaction hash
  txHash?: string;
  
  // Error handling
  errorMessage?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

---

## Redis Data Structure

### Checkout Config

**Key**: `checkout:config:{checkoutId}`

```json
{
  "id": "abc123",
  "name": "My Checkout",
  "description": "Description",
  "mode": "payment",
  "ownerId": "user-123",
  "config": {
    "theme": { ... },
    "branding": { ... },
    "depositDestination": "embedded",
    "settlement": { ... }
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Transaction

**Key**: `checkout:transaction:{checkoutId}:{txId}`

```json
{
  "id": "tx-123",
  "checkoutId": "abc123",
  "status": "submitted",
  "externalId": "order-456",
  "metadata": { "customerId": "789" },
  "walletAddress": "0x...",
  "fromChainId": 1,
  "toChainId": 8453,
  "fromToken": { ... },
  "toToken": { ... },
  "fromAmount": "1000000000",
  "toAmount": "999500000",
  "txHash": "0x...",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### User Stats

**Key**: `checkout:user:{checkoutId}:{walletAddress}:{chainId}`

```json
{
  "id": "user-123",
  "checkoutId": "abc123",
  "walletAddress": "0x...",
  "chainId": 1,
  "transactionCount": 5,
  "firstSeenAt": "2024-01-01T00:00:00Z",
  "lastSeenAt": "2024-01-01T00:00:00Z"
}
```

### Stats Cache

**Key**: `checkout:stats:{checkoutId}`

```json
{
  "totalTransactions": 100,
  "transactionsByStatus": {
    "initialized": 10,
    "draft": 5,
    "submitted": 3,
    "pending": 2,
    "confirmed": 75,
    "failed": 3,
    "expired": 1,
    "abandoned": 1,
    "cancelled": 0
  },
  "totalUsers": 50,
  "successRate": 0.96,
  "avgCompletionTimeSeconds": 45
}
```

---

## Security Considerations

### Public Endpoints

- Checkout config endpoint (`GET /api/checkouts/[id]`) is public to allow embedding
- Transaction initialization (`POST /api/checkouts/[id]/transactions`) is public for server-side usage
- Transaction status (`GET /api/checkouts/[id]/transactions/[txId]/status`) is public for polling

**Security**: Checkout IDs are obfuscated (not easily guessable), providing sufficient security for public access.

### Authenticated Endpoints

- All transaction management endpoints require Dynamic JWT
- User info extracted from JWT token
- Owner validation for checkout operations

### CORS

- CORS enabled for public endpoints
- Configured in `lib/cors.ts`
- Allows widget to call API from different origin

---

## Testing & Development

### Running Locally

1. **Dashboard**:
   ```bash
   cd demo-dashboard
   pnpm install
   pnpm dev  # Runs on http://localhost:3001
   ```

2. **Widget**:
   ```bash
   cd examples/examples/nextjs-payment-widget
   pnpm install
   pnpm dev  # Runs on http://localhost:3000
   ```

### Environment Setup

**Dashboard** (`.env.local`):
```env
DYNAMIC_ENVIRONMENT_ID=your_env_id
DYNAMIC_SECRET_KEY=your_secret_key
REDIS_URL=your_redis_url
UPSTASH_QSTASH_URL=your_qstash_url
UPSTASH_QSTASH_TOKEN=your_qstash_token
NEXT_PUBLIC_WIDGET_PROJECT_URL=http://localhost:3000
```

**Widget** (`.env.local`):
```env
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_env_id
NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:3001
```

### Demo Checkouts

The system supports demo/preview checkouts:
- IDs starting with `demo-` or `preview-` are virtual
- Created on-the-fly with default config
- Useful for testing without creating real checkouts

---

## Future Enhancements

Potential improvements for production:

1. **Webhooks**: Notify external systems of transaction status changes
2. **Analytics**: More detailed analytics and reporting
3. **Multi-currency**: Support for fiat currency display
4. **Payment Links**: Generate shareable payment links
5. **Refunds**: Support for refund transactions
6. **Rate Limiting**: API rate limiting for public endpoints
7. **Caching**: More aggressive caching for config endpoints
8. **Monitoring**: Better observability and alerting

---

## Related Documentation

- [Payment Widget README](../examples/examples/nextjs-payment-widget/README.md)
- [Dashboard README](./README.md)
- [Dynamic SDK Documentation](https://www.dynamic.xyz/docs)
- [LI.FI Documentation](https://docs.li.fi/)

