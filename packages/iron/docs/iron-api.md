# Iron API Documentation

## Table of Contents
1. [Overview](#overview)
2. [User Onboarding Flow](#user-onboarding-flow)
3. [Ramp Operations](#ramp-operations)
4. [API Reference](#api-reference)
5. [Code Examples](#code-examples)

---

## Overview

This documentation covers the Iron API integration for converting between fiat currency (like USD, EUR) and cryptocurrency (like USDC, USDT).

### Official Documentation

- **[Iron Official Docs →](https://docs.iron.xyz/)** - Complete API reference and guides
- **[Get API Access →](https://app.iron.xyz/)** - Sign up for production access
- **[Sandbox Environment →](https://app.sandbox.iron.xyz/)** - Test environment for development

**Base URL**: All endpoints are relative to `/api/iron/`

**Authentication**: All endpoints require authentication via Dynamic's `withAuth` middleware.

---

## User Onboarding Flow

The complete user onboarding process consists of 5 steps that must be completed in order:

```
Profile → KYC → Signings → Wallet → Bank Account
```

### Step 1: Create Customer Profile

**Endpoint**: `POST /api/iron/customers`

**Purpose**: Register a new customer in the Iron system.

**Required Fields**:
- `type`: "individual" or "business"
- `email`: Customer email
- `first_name`: First name
- `last_name`: Last name
- `country_code`: ISO country code (e.g., "US", "DE")
- `date_of_birth`: YYYY-MM-DD format
- `phone_number`: E.164 format (e.g., "+14155552671")

**Optional Fields**:
- `metadata`: Custom key-value pairs

**Response**:
```json
{
  "id": "cus_abc123",
  "type": "individual",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "status": "active"
}
```

**Save**: Store `customer_id` for all subsequent API calls.

---

### Step 2: Start KYC Verification

**Endpoint**: `POST /api/iron/customers/{customer_id}/kyc`

**Purpose**: Initiate identity verification process via Iron's KYC partner.

**Request**:
```json
{
  "return_url": "https://yourdomain.com/onboard"
}
```

**Response**:
```json
{
  "url": "https://kyc-provider.com/verify?token=...",
  "identification_id": "idn_xyz789"
}
```

**Action**: Redirect user to the `url` for identity verification. When complete, they'll be redirected back to `return_url`.

**Check Status**:
```
GET /api/iron/customers/{customer_id}/identifications
```

**Response**:
```json
{
  "data": [
    {
      "id": "idn_xyz789",
      "status": "approved" | "pending" | "rejected",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

More info on the different ways to do the [KYC verification](https://docs.iron.xyz/kyc) can be found in the official documentation.

**Sandbox Testing** (Development only):
```
POST /api/iron/sandbox/identification/{identification_id}
{
  "approved": true
}
```

---

### Step 3: Sign Documents (If Required)

**Check for Required Signings**:
```
GET /api/iron/customers/{customer_id}/signings
```

**Response**:
```json
{
  "data": [
    {
      "id": "sig_123",
      "content_id": "terms_of_service",
      "content_type": "Url",
      "content": "https://example.com/terms.pdf",
      "status": "pending"
    }
  ]
}
```

**If `data` is empty**: Skip to Step 4.

**Submit Signatures**:
```
POST /api/iron/customers/{customer_id}/signings
{
  "content_id": "terms_of_service",
  "content_type": "Url",
  "signed": true
}
```

Repeat for each document with `status: "pending"`.

---

### Step 4: Register Wallet

**Purpose**: Link a blockchain wallet to the customer account.

#### Option A: Self-Hosted Wallet (User Controls Private Keys)
(This is what we do for embedded wallets)
**Endpoint**: `POST /api/iron/wallets/self-hosted`

**Process**:
1. Generate proof-of-ownership message
2. User signs message with their wallet
3. Submit signed message to Iron

**Required Fields**:
- `customer_id`: Customer ID from Step 1
- `blockchain`: "ethereum" | "polygon" | "base" | "solana" | "arbitrum" | ...
- `wallet_address`: Blockchain address (checksummed for EVM)
- `message`: Exact message that was signed
- `signature`: Hex-encoded signature

**Message Format**:
```
I am verifying ownership of the wallet address {address} as customer {customer_id}.
This message was signed on {date} to confirm my control over this wallet.
```

**Example**:
```json
{
  "customer_id": "cus_abc123",
  "blockchain": "base",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "message": "I am verifying ownership of the wallet address 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb as customer cus_abc123. This message was signed on 2025-01-15 to confirm my control over this wallet.",
  "signature": "0x...",
  "label": "Primary Wallet"
}
```

**Response**:
```json
{
  "id": "wal_def456",
  "customer_id": "cus_abc123",
  "blockchain": "base",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "status": "active"
}
```

#### Option B: Hosted Wallet (For exchanges, not really relevant for us)

**Endpoint**: `POST /api/iron/wallets/hosted`

**Required Fields**:
- `customer_id`: Customer ID
- `blockchain`: Chain identifier
- `label`: Wallet nickname

**Example**:
```json
{
  "customer_id": "cus_abc123",
  "blockchain": "base",
  "label": "My Hosted Wallet"
}
```

**No signature required** - Iron generates and controls the wallet.

**Save**: Store `wallet_id` and `wallet_address` for ramp operations.

---

### Step 5: Add Bank Account

**Endpoint**: `POST /api/iron/banks`

**Purpose**: Register a fiat bank account for deposits/withdrawals.

**For SEPA (European) Accounts**:
```json
{
  "customer_id": "cus_abc123",
  "currency": "EUR",
  "account_holder_name": "John Doe",
  "iban": "DE89370400440532013000",
  "bank_name": "Deutsche Bank",
  "bank_country": "DE",
  "street": "123 Main St",
  "city": "Berlin",
  "state": "Berlin",
  "country": "DE",
  "postal_code": "10115",
  "label": "Primary Bank Account"
}
```

**For US (ACH) Accounts**:
```json
{
  "customer_id": "cus_abc123",
  "currency": "USD",
  "account_holder_name": "John Doe",
  "account_number": "123456789",
  "routing_number": "021000021",
  "bank_name": "Chase Bank",
  "bank_country": "US",
  "label": "Checking Account"
}
```

**Response**:
```json
{
  "id": "bnk_ghi789",
  "customer_id": "cus_abc123",
  "currency": "EUR",
  "status": "active",
  "iban": "DE89370400440532013000"
}
```

**Save**: Store `bank_account_id` for offramp operations.

**Onboarding Complete**: User can now perform onramps and offramps.

---

## Required Data to Save

During the onboarding process, you must save certain IDs and details to enable future operations. These can be stored in your database, localStorage, or Dynamic's user metadata (as demonstrated in the euro-ramp example).

### Critical Data to Persist

| Field | When to Save | Why You Need It | Example Value |
|-------|--------------|-----------------|---------------|
| `customerId` | After Step 1 (Create Customer) | Required for all subsequent API calls (KYC, wallets, banks, quotes, ramps) | `"cus_abc123"` |
| `walletId` | After Step 4 (Register Wallet) | Required for onramp operations (specifies where crypto should be sent) | `"wal_def456"` |
| `walletAddress` | After Step 4 (Register Wallet) | Display to user, verify transactions | `"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"` |
| `bankAccountId` | After Step 5 (Add Bank Account) | Required for offramp operations (specifies where fiat should be sent) | `"bnk_ghi789"` |

### Optional Data to Persist

These fields improve user experience but aren't strictly required for API operations:

| Field | When to Save | Why It's Helpful | Example Value |
|-------|--------------|------------------|---------------|
| `identificationId` | After Step 2 (Start KYC) | Check KYC status without listing all identifications | `"idn_xyz789"` |
| `kycUrl` | After Step 2 (Start KYC) | Allow user to resume KYC if they navigated away | `"https://kyc.iron.xyz/verify?token=..."` |
| `bankIban` | After Step 5 (Add Bank Account) | Display to user for reference | `"DE89370400440532013000"` |
| `step` | After each step | Resume onboarding from correct step if user leaves | `"kyc"` \| `"wallet"` \| `"bank"` |
| `kycCompleted` | After KYC approval | Quick check if user can transact | `true` \| `false` |

### Storage Options

**Option 1: Dynamic User Metadata** (Recommended for Dynamic-powered apps)
```typescript
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

const { user, setUser } = useDynamicContext();

// Save data
await setUser({
  metadata: {
    ...user?.metadata,
    iron: {
      customerId: 'cus_abc123',
      walletId: 'wal_def456',
      bankAccountId: 'bnk_ghi789',
      step: 'complete',
      kycCompleted: true,
    }
  }
});

// Read data
const ironData = user?.metadata?.iron;
const customerId = ironData?.customerId;
```

**Option 2: Your Own Database**
```typescript
// Save to your backend
await fetch('/api/users/onboarding', {
  method: 'PATCH',
  body: JSON.stringify({
    userId: user.id,
    ironCustomerId: 'cus_abc123',
    ironWalletId: 'wal_def456',
    ironBankAccountId: 'bnk_ghi789',
  }),
});
```

**Option 3: localStorage** (Development/Testing only)
```typescript
// Not recommended for production - data is lost if user clears browser
localStorage.setItem('iron_customer_id', 'cus_abc123');
localStorage.setItem('iron_wallet_id', 'wal_def456');
```

### Real Example

The `/examples/examples/euro-ramp` demo uses Dynamic's user metadata to persist all onboarding state:

```typescript
// From euro-ramp's useKYCMetadata hook
const updateState = async (updates: Partial<KYCState>) => {
  await setUser({
    metadata: {
      ...user?.metadata,
      kyc: {
        customerId,
        walletId,
        walletAddress,
        bankAccountId,
        bankIban,
        identificationId,
        kycUrl,
        step,
        kycCompleted,
        ...updates, // Apply new updates
      }
    }
  });
};

// Usage in onboarding flow
await updateState({ customerId: result.data.id, step: 'kyc' });
await updateState({ walletId: wallet.id, walletAddress: address, step: 'bank' });
await updateState({ bankAccountId: bank.id, step: 'complete', kycCompleted: true });
```

This approach allows users to:
- Resume onboarding after closing the browser
- Access their Iron data across devices (if Dynamic syncs to your backend)
- Maintain state through KYC redirects

---

## Ramp Operations

### Onramp Flow (Fiat → Crypto)

The onramp process converts fiat currency to cryptocurrency and delivers it to the user's wallet.

#### Step 1: Get Quote

**Endpoint**: `POST /api/iron/quotes/onramp`

**Purpose**: Calculate conversion rate, fees, and amounts.

**Request**:
```json
{
  "customer_id": "cus_abc123",
  "source_currency": "EUR",
  "destination_currency": "USDC",
  "source_amount": 10000,
  "wallet_id": "wal_def456",
  "payment_rail": "sepa"
}
```

**Field Notes**:
- `source_amount`: Amount in **cents** (10000 = €100.00)
- `source_currency`: Fiat currency code (EUR, USD, GBP)
- `destination_currency`: Crypto ticker (USDC, USDT, ETH, BTC)
- `payment_rail`: "sepa" | "ach" | "wire" | "instant_sepa"
- `wallet_id`: Wallet ID from Step 4 of onboarding

**Alternative**: Use `destination_amount` instead of `source_amount` to specify desired crypto amount (in smallest unit, e.g., 100000000 = 100 USDC).

**Response**:
```json
{
  "id": "quo_123",
  "source_currency": "EUR",
  "source_amount": 10000,
  "destination_currency": "USDC",
  "destination_amount": 108500000,
  "exchange_rate": "1.085",
  "fee": 250,
  "expires_at": "2025-01-15T10:35:00Z"
}
```

**Important**: Quotes expire! Execute within the `expires_at` window (typically 30 seconds).

#### Step 2: Execute Onramp

**Endpoint**: `POST /api/iron/onramps`

**Request**:
```json
{
  "quote_id": "quo_123",
  "customer_id": "cus_abc123",
  "wallet_id": "wal_def456"
}
```

**Response**:
```json
{
  "id": "onr_abc",
  "status": "pending_payment",
  "payment_instructions": {
    "account_number": "DE89370400440532013000",
    "beneficiary_name": "Iron Tech GmbH",
    "bank_name": "Deutsche Bank",
    "bic": "DEUTDEFF",
    "reference": "ONR-ABC123"
  }
}
```

**Understanding the Virtual Bank Account**:

The `payment_instructions` object contains a **virtual bank account** that Iron generates specifically for this transaction:

- **`account_number`**: The virtual IBAN/account number where the user sends money
- **`beneficiary_name`**: The account holder name (Iron or their banking partner)
- **`bank_name`**: The bank holding the virtual account
- **`bic`**: The BIC/SWIFT code for international transfers
- **`reference`**: Transaction reference code (optional but recommended for faster processing)

This virtual account is:
- ✅ **Unique** to this specific transaction
- ✅ **Automatically matched** to the onramp order when payment arrives
- ✅ **Monitored** by Iron for incoming transfers
- ✅ **Safe** - funds are held by Iron's regulated banking partners

**How it works internally** (from `iron.ts:1100-1109`):
```typescript
payment_instructions: data.deposit_rails?.[0]
  ? {
      account_number: data.deposit_rails[0].iban || "",
      bank_name: data.deposit_rails[0].name || "Iron Bank",
      bic: data.deposit_rails[0].bic,
      beneficiary_name: data.deposit_rails[0].beneficiary_name,
      address: data.deposit_rails[0].address,
      phone: data.deposit_rails[0].phone,
    }
  : undefined
```

Iron's API returns these details in the `deposit_rails` array, which contains the banking information for where the user should send their fiat payment.

#### Step 3: User Sends Payment

**Action**: User transfers fiat from their bank to the virtual account using the `payment_instructions`.

**Important**: Include the exact `reference` in the transfer to match the transaction.

#### Step 4: Monitor Status

**Endpoint**: `GET /api/iron/onramps/{onramp_id}`

**Status Flow**:
1. `pending_payment` - Waiting for fiat transfer
2. `payment_received` - Fiat received, processing conversion
3. `processing` - Converting fiat to crypto
4. `completed` - Crypto sent to wallet
5. `failed` - Transaction failed (with reason)
6. `cancelled` - User cancelled

**Webhooks**: Configure webhooks in Iron dashboard to receive real-time status updates.

---

### Offramp Flow (Crypto → Fiat)

An **offramp** is the process of converting cryptocurrency into traditional fiat currency (like USD or EUR) and depositing it into a user's bank account. Think of it as "cashing out" or "withdrawing" your crypto to real money you can spend.

**How it works:**
The user specifies how much crypto they want to convert, gets a quote showing the exact fiat amount they'll receive (after fees), then sends their crypto to a provided address. Iron automatically detects the deposit, converts the crypto to fiat at the quoted rate, and transfers the money to the user's registered bank account via SEPA, ACH, Wire, or other payment rails.

The offramp process converts cryptocurrency to fiat and deposits it into the user's bank account.

#### Step 1: Get Quote

**Endpoint**: `POST /api/iron/quotes/offramp`

**Request**:
```json
{
  "customer_id": "cus_abc123",
  "source_currency": "USDC",
  "destination_currency": "EUR",
  "source_amount": 100000000,
  "bank_account_id": "bnk_ghi789"
}
```

**Field Notes**:
- `source_amount`: Amount in **smallest unit** (100000000 = 100 USDC with 6 decimals)
- `source_currency`: Crypto ticker
- `destination_currency`: Fiat currency code
- `bank_account_id`: Bank account ID from Step 5 of onboarding

**Response**:
```json
{
  "id": "quo_456",
  "source_currency": "USDC",
  "source_amount": 100000000,
  "destination_currency": "EUR",
  "destination_amount": 9200,
  "exchange_rate": "0.92",
  "fee": 100,
  "expires_at": "2025-01-15T10:35:00Z"
}
```

#### Step 2: Execute Offramp

**Endpoint**: `POST /api/iron/offramps`

**Request**:
```json
{
  "quote_id": "quo_456",
  "customer_id": "cus_abc123",
  "bank_account_id": "bnk_ghi789"
}
```

**Response**:
```json
{
  "id": "off_xyz",
  "status": "pending_deposit",
  "deposit_instructions": {
    "blockchain": "base",
    "address": "0x1234...",
    "amount": "100.000000",
    "currency": "USDC",
    "memo": "OFF-XYZ789"
  }
}
```

#### Step 3: User Sends Crypto

**Action**: User sends exact amount of crypto to the deposit address.

**Important**:
- Send exact amount specified in `deposit_instructions.amount`
- Include `memo` if provided (for networks like Solana)
- Use correct blockchain

#### Step 4: Monitor Status

**Endpoint**: `GET /api/iron/offramps/{offramp_id}`

**Status Flow**:
1. `pending_deposit` - Waiting for crypto deposit
2. `deposit_received` - Crypto received, awaiting confirmations
3. `processing` - Converting crypto to fiat
4. `completed` - Fiat sent to bank account
5. `failed` - Transaction failed (with reason)
6. `cancelled` - User cancelled

---

### Transaction Management

#### List Onramps
```
GET /api/iron/onramps?customer_id={customer_id}&limit=50&offset=0
```

#### List Offramps
```
GET /api/iron/offramps?customer_id={customer_id}&limit=50&offset=0
```

#### Cancel Transaction
```
POST /api/iron/onramps/{onramp_id}/cancel
POST /api/iron/offramps/{offramp_id}/cancel
```

Only works for transactions in `pending_payment` or `pending_deposit` status.

---

## API Reference

### Customers

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/customers` | **Create a new customer** - Register an individual or business. This is always the first step. Returns a customer ID you'll use for all future operations. | New user signs up |
| GET | `/api/iron/customers` | **List all customers** - Retrieve all your registered customers with pagination. Shows KYC status and basic info. | View customer list |
| GET | `/api/iron/customers/{id}` | **Get customer details** - Fetch complete customer profile including KYC status, linked wallets, and bank accounts. | View user profile |
| PATCH | `/api/iron/customers/{id}` | **Update customer information** - Modify customer details like name, email, or metadata. Cannot change country or DOB after creation. | User updates profile |

### KYC & Verification

KYC (Know Your Customer) is identity verification required by financial regulations. Users must verify their identity before making transactions.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/customers/{id}/kyc` | **Start KYC verification** - Generates a URL to redirect users to Iron's verification partner. Users upload ID and take a selfie. Process takes 1-5 minutes. | User needs to verify identity |
| GET | `/api/iron/customers/{id}/kyc` | **Get KYC status** - Check if verification is approved, pending, or rejected. Must be approved before transactions. | Check if user can transact |
| GET | `/api/iron/customers/{id}/identifications` | **List identity verifications** - See all verification attempts with timestamps and status history. | Track verification history |
| POST | `/api/iron/sandbox/identification/{id}` | **Approve KYC (sandbox only)** - Instantly approve KYC for testing. Only works in sandbox environment. Never use in production. | Testing in development |

### Document Signing

Some regions require users to sign terms of service or other legal documents before transacting.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| GET | `/api/iron/customers/{id}/signings` | **List required documents** - Check if there are any pending documents the user needs to sign. Returns empty array if none required. | Check for required signatures |
| POST | `/api/iron/customers/{id}/signings` | **Submit document signature** - Record that the user has agreed to a document. User must accept each document. | User accepts terms of service |

### Wallets

Wallets are cryptocurrency addresses where users can receive funds from onramps or send funds for offramps.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/wallets/hosted` | **Register hosted wallet** - Create a wallet that Iron controls (custodial). Iron generates and manages the private keys. Best for exchanges or platforms managing user funds. | Platform manages user crypto |
| POST | `/api/iron/wallets/self-hosted` | **Register self-hosted wallet** - Connect a wallet the user controls (like Dynamic embedded wallets). Requires the user to sign a message proving ownership. This is the recommended approach for self-custody. | User controls their own wallet |
| GET | `/api/iron/wallets/{id}` | **Get wallet details** - Fetch wallet information including address, blockchain, and status. | View wallet info |
| GET | `/api/iron/customers/{id}/wallets` | **List customer wallets** - Get all wallets linked to a customer across all blockchains. | Show user's wallets |

### Bank Accounts

Bank accounts are where users receive fiat money from offramps (crypto-to-fiat conversions).

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/banks` | **Register bank account** - Add a user's bank account for receiving fiat from offramps. Supports SEPA (Europe), ACH (US), Wire, PIX (Brazil), Faster Payments (UK). Users must provide account details. | User wants to cash out |
| GET | `/api/iron/banks/{id}` | **Get bank account details** - Fetch bank account information and verification status. | View bank account info |
| GET | `/api/iron/customers/{id}/banks` | **List customer bank accounts** - Get all bank accounts linked to a customer. | Show user's bank accounts |

### Quotes

Quotes provide exchange rates and fees before executing transactions. They expire quickly (typically 30 seconds).

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/quotes/onramp` | **Get onramp quote** - Request a price for converting fiat to crypto. Example: "How much USDC will I get for $100?" Returns the exact amount after fees and the exchange rate. Quote expires in 30 seconds. | User wants to buy crypto |
| POST | `/api/iron/quotes/offramp` | **Get offramp quote** - Request a price for converting crypto to fiat. Example: "How much USD will I get for 100 USDC?" Returns the exact amount that will arrive in their bank account. Quote expires in 30 seconds. | User wants to cash out |
| GET | `/api/iron/quotes/{id}` | **Get quote details** - Retrieve a previously generated quote to check the rate and expiration time. | Review previous quote |

### Onramps

Onramps convert fiat currency (USD, EUR, etc.) into cryptocurrency. The user sends money from their bank and receives crypto in their wallet.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/onramps` | **Execute onramp** - Start a fiat-to-crypto transaction. Returns virtual account details (IBAN or account number) where the user should send their bank transfer. Iron monitors for the incoming payment. When received, converts to crypto and sends to user's wallet. | User wants to buy crypto |
| GET | `/api/iron/onramps` | **List onramps** - Retrieve all onramp transactions with filtering and pagination. Shows status of each transaction. | View transaction history |
| GET | `/api/iron/onramps/{id}` | **Get onramp status** - Check the current status of an onramp. Status flow: pending_payment → payment_received → processing → completed. | Track transaction progress |
| POST | `/api/iron/onramps/{id}/cancel` | **Cancel onramp** - Cancel an onramp before payment is received. Cannot cancel after funds are received or processing has started. | User changes their mind |

### Offramps

Offramps convert cryptocurrency into fiat currency that gets deposited into the user's bank account. This is "cashing out" or "withdrawing" crypto.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/offramps` | **Execute offramp (cash out)** - Start a crypto-to-fiat transaction. Returns a deposit address where the user should send their crypto. Iron monitors the blockchain for the deposit. When received, converts to fiat and sends to user's bank account via SEPA, ACH, or Wire transfer. | User wants to cash out crypto |
| GET | `/api/iron/offramps` | **List offramps** - Retrieve all offramp transactions with filtering and pagination. Shows how much crypto was sent and how much fiat was received. | View cashout history |
| GET | `/api/iron/offramps/{id}` | **Get offramp status** - Check the current status of an offramp. Status flow: pending_deposit → deposit_received → processing → completed. User can track when their bank will receive the money. | Track when money arrives |
| POST | `/api/iron/offramps/{id}/cancel` | **Cancel offramp** - Cancel an offramp before crypto is sent. Cannot cancel after the crypto deposit is detected. | User changes their mind |

### Payments

Third-party payments allow businesses to pay on behalf of users (B2B2C model). Useful for covering fees or providing rewards.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| POST | `/api/iron/third-party-payments` | **Create payment** - Business pays for a user's transaction. Platform can cover fees or subsidize conversions as a user benefit. | Platform covers user fees |
| GET | `/api/iron/third-party-payments` | **List payments** - Retrieve all third-party payment transactions with filtering. | View platform payments |
| GET | `/api/iron/third-party-payments/{id}` | **Get payment details** - Fetch details about a specific third-party payment. | View payment info |

### Virtual Accounts

Virtual accounts are unique bank account numbers assigned to users for receiving fiat payments in onramps.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| GET | `/api/iron/customers/{id}/virtual-accounts` | **List virtual accounts** - Get all virtual IBANs or account numbers assigned to a customer. Each can be used for bank transfers. | Show user's payment details |

### Auto Ramps

Auto ramps automatically convert incoming funds according to predefined rules.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| GET | `/api/iron/customers/{id}/autoramps` | **List auto-ramp configurations** - Get automated conversion rules set up for a customer. | View auto-conversion settings |

### Utilities

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| GET | `/api/iron/fiatcurrencies` | **List supported fiat currencies** - Get all fiat currencies supported by Iron (USD, EUR, GBP, BRL, MXN, etc.) with their codes and supported payment rails. | Show currency options |

---

## Code Examples

### Frontend: Complete Onboarding Flow

```typescript
import { useState } from 'react';

export default function OnboardingFlow() {
  const [step, setStep] = useState<'profile' | 'kyc' | 'signings' | 'wallet' | 'bank'>('profile');
  const [customerId, setCustomerId] = useState<string>('');
  const [walletId, setWalletId] = useState<string>('');

  // Step 1: Create Customer
  const createCustomer = async (data: any) => {
    const res = await fetch('/api/iron/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const customer = await res.json();
    setCustomerId(customer.id);
    setStep('kyc');
  };

  // Step 2: Start KYC
  const startKYC = async () => {
    const res = await fetch(`/api/iron/customers/${customerId}/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_url: window.location.href }),
    });
    const { url } = await res.json();
    window.location.href = url; // Redirect to KYC provider
  };

  // Step 3: Sign Documents (if needed)
  const checkSignings = async () => {
    const res = await fetch(`/api/iron/customers/${customerId}/signings`);
    const { data } = await res.json();
    if (data.length === 0) {
      setStep('wallet');
      return;
    }
    // Show document signing UI
  };

  const signDocument = async (contentId: string, contentType: string) => {
    await fetch(`/api/iron/customers/${customerId}/signings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_id: contentId,
        content_type: contentType,
        signed: true,
      }),
    });
    // Check if more documents need signing
    await checkSignings();
  };

  // Step 4: Register Wallet
  const registerWallet = async (address: string, signature: string, blockchain: string) => {
    const message = `I am verifying ownership of the wallet address ${address} as customer ${customerId}. This message was signed on ${new Date().toISOString().split('T')[0]} to confirm my control over this wallet.`;

    const res = await fetch('/api/iron/wallets/self-hosted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        blockchain,
        wallet_address: address,
        message,
        signature,
        label: 'Primary Wallet',
      }),
    });
    const wallet = await res.json();
    setWalletId(wallet.id);
    setStep('bank');
  };

  // Step 5: Add Bank Account
  const addBankAccount = async (data: any) => {
    await fetch('/api/iron/banks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customer_id: customerId }),
    });
    // Onboarding complete!
  };

  return (
    <div>
      {step === 'profile' && <ProfileForm onSubmit={createCustomer} />}
      {step === 'kyc' && <KYCStep onStart={startKYC} />}
      {step === 'signings' && <SigningsStep onSign={signDocument} />}
      {step === 'wallet' && <WalletStep onRegister={registerWallet} />}
      {step === 'bank' && <BankStep onSubmit={addBankAccount} />}
    </div>
  );
}
```

### Frontend: Execute Onramp

```typescript
const executeOnramp = async (
  customerId: string,
  walletId: string,
  sourceCurrency: string,
  destinationCurrency: string,
  sourceAmount: number, // in cents
  blockchain: string
) => {
  // Step 1: Get quote
  const quoteRes = await fetch('/api/iron/quotes/onramp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: customerId,
      source_currency: sourceCurrency,
      destination_currency: destinationCurrency,
      source_amount: sourceAmount,
      wallet_id: walletId,
      payment_rail: 'sepa',
    }),
  });
  const quote = await quoteRes.json();

  // Step 2: Execute onramp
  const onrampRes = await fetch('/api/iron/onramps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quote_id: quote.id,
      customer_id: customerId,
      wallet_id: walletId,
    }),
  });
  const onramp = await onrampRes.json();

  // Step 3: Access virtual bank account from payment_instructions
  const virtualAccount = onramp.payment_instructions;
  console.log('Virtual Bank Account Details:');
  console.log('IBAN:', virtualAccount.account_number);
  console.log('Bank:', virtualAccount.bank_name);
  console.log('BIC:', virtualAccount.bic);
  console.log('Beneficiary:', virtualAccount.beneficiary_name);

  // Display to user - they need to send money to this account
  return {
    onrampId: onramp.id,
    status: onramp.status,
    virtualAccount: {
      iban: virtualAccount.account_number,
      bankName: virtualAccount.bank_name,
      bic: virtualAccount.bic,
      beneficiary: virtualAccount.beneficiary_name,
    }
  };
};
```

### Frontend: Execute Offramp

```typescript
const executeOfframp = async (
  customerId: string,
  bankAccountId: string,
  sourceCurrency: string,
  destinationCurrency: string,
  sourceAmount: number, // in smallest unit (e.g., 1000000 = 1 USDC)
) => {
  // Step 1: Get quote
  const quoteRes = await fetch('/api/iron/quotes/offramp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: customerId,
      source_currency: sourceCurrency,
      destination_currency: destinationCurrency,
      source_amount: sourceAmount,
      bank_account_id: bankAccountId,
    }),
  });
  const quote = await quoteRes.json();

  // Step 2: Execute offramp
  const offrampRes = await fetch('/api/iron/offramps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quote_id: quote.id,
      customer_id: customerId,
      bank_account_id: bankAccountId,
    }),
  });
  const offramp = await offrampRes.json();

  // Step 3: Display deposit instructions
  console.log('Send crypto to:', offramp.deposit_instructions);
  return offramp;
};
```

### Backend: Create API Route with Error Handling

```typescript
import { NextRequest } from 'next/server';
import { createResponse, handleApiError } from '@/utils/apiHelpers';
import { withAuth } from '@/middleware/auth';
import { z } from 'zod';

const schema = z.object({
  customer_id: z.string().uuid(),
  amount: z.number().positive(),
});

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = schema.parse(body);

    // Your logic here
    const result = await performOperation(validated);

    return createResponse(result, 201);
  } catch (error) {
    return handleApiError(error, 'operation-name', req);
  }
}

export const POST = withAuth(handler);
```

### Frontend: Display Virtual Bank Account to User

After executing an onramp, show the virtual bank account details to the user so they can make the bank transfer:

```typescript
import { useState, useEffect } from 'react';

interface VirtualAccountDetails {
  iban: string;
  bankName: string;
  bic: string;
  beneficiary: string;
}

export function OnrampPaymentInstructions({ onrampId }: { onrampId: string }) {
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccountDetails | null>(null);

  useEffect(() => {
    // Fetch onramp details
    fetch(`/api/iron/onramps/${onrampId}`)
      .then(res => res.json())
      .then(onramp => {
        if (onramp.payment_instructions) {
          setVirtualAccount({
            iban: onramp.payment_instructions.account_number,
            bankName: onramp.payment_instructions.bank_name,
            bic: onramp.payment_instructions.bic,
            beneficiary: onramp.payment_instructions.beneficiary_name,
          });
        }
      });
  }, [onrampId]);

  if (!virtualAccount) return <div>Loading payment details...</div>;

  return (
    <div className="payment-instructions">
      <h2>Send Your Payment</h2>
      <p>Transfer funds to the following virtual bank account:</p>

      <div className="account-details">
        <div className="detail-row">
          <span className="label">IBAN:</span>
          <span className="value">{virtualAccount.iban}</span>
          <button onClick={() => navigator.clipboard.writeText(virtualAccount.iban)}>
            Copy
          </button>
        </div>

        <div className="detail-row">
          <span className="label">Bank:</span>
          <span className="value">{virtualAccount.bankName}</span>
        </div>

        <div className="detail-row">
          <span className="label">BIC/SWIFT:</span>
          <span className="value">{virtualAccount.bic}</span>
          <button onClick={() => navigator.clipboard.writeText(virtualAccount.bic)}>
            Copy
          </button>
        </div>

        <div className="detail-row">
          <span className="label">Beneficiary:</span>
          <span className="value">{virtualAccount.beneficiary}</span>
        </div>
      </div>

      <div className="warning">
        <strong>Important:</strong>
        <ul>
          <li>This account is unique to your transaction</li>
          <li>Only send the exact amount from the quote</li>
          <li>Your crypto will be sent once payment is confirmed</li>
          <li>Processing typically takes 1-3 business days for SEPA transfers</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## Best Practices

### Amount Handling

**Fiat amounts**: Always use **cents** (smallest currency unit)
```typescript
// Correct
source_amount: 10000  // €100.00

// Wrong
source_amount: 100.00  // Will be interpreted as €1.00
```

**Crypto amounts**: Always use **smallest unit** (e.g., 6 decimals for USDC)
```typescript
// Correct
source_amount: 100000000  // 100 USDC

// Wrong
source_amount: 100  // Will be interpreted as 0.0001 USDC
```

### Quote Expiration

Quotes expire quickly (typically 30 seconds). Always:
1. Show countdown timer to user
2. Check `expires_at` before execution
3. Get new quote if expired

### Error Handling

```typescript
try {
  const res = await fetch('/api/iron/onramps', { ... });
  if (!res.ok) {
    const error = await res.json();
    // Show user-friendly error message
    console.error('Onramp failed:', error.message);
  }
} catch (error) {
  // Handle network errors
  console.error('Network error:', error);
}
```

### State Management

For onboarding flows, persist state to handle:
- Page refreshes
- Navigation away and back
- KYC redirect returns

```typescript
// Use localStorage or server-side sessions
const saveOnboardingState = (state: any) => {
  localStorage.setItem('onboarding_state', JSON.stringify(state));
};

const loadOnboardingState = () => {
  const saved = localStorage.getItem('onboarding_state');
  return saved ? JSON.parse(saved) : null;
};
```

### Webhooks

Configure webhooks in the Iron dashboard to receive real-time updates:
- `onramp.status_updated`
- `offramp.status_updated`
- `kyc.status_updated`
- `payment.received`

This avoids polling and provides instant updates to users.

---

## Troubleshooting

### Common Issues

**KYC Redirect Not Working**:
- Ensure `return_url` matches your domain whitelist in Iron dashboard
- Use absolute URLs, not relative paths

**Wallet Registration Fails**:
- Verify signature is hex-encoded (starts with "0x")
- Check message format exactly matches documented format
- Ensure blockchain address is checksummed (for EVM chains)

**Quote Expired**:
- Reduce time between quote and execution
- Show clear countdown timer to users
- Implement auto-refresh if nearing expiration

**Amount Mismatch**:
- Double-check unit conversion (cents for fiat, smallest unit for crypto)
- Use BigNumber library for precise calculations
- Never use floating point for financial calculations

**Bank Transfer Not Detected**:
- Verify user included exact reference code
- Check transfer amount matches quote exactly
- SEPA transfers can take 1-2 business days

---

## Support

For issues or questions:
- **Email**: support@iron.xyz
- **Official Documentation**: [https://docs.iron.xyz](https://docs.iron.xyz)
- **Production Dashboard**: [https://app.iron.xyz](https://app.iron.xyz)
- **Sandbox Dashboard**: [https://app.sandbox.iron.xyz](https://app.sandbox.iron.xyz)

### Additional Resources

- **[API Reference](https://docs.iron.xyz/api-reference)** - Complete API documentation with all endpoints
- **[Guides](https://docs.iron.xyz/guides)** - Step-by-step tutorials for common use cases
- **[Webhooks](https://docs.iron.xyz/webhooks)** - Set up real-time notifications for transaction events
- **[Supported Currencies](https://docs.iron.xyz/currencies)** - Full list of fiat and crypto currencies
- **[Payment Rails](https://docs.iron.xyz/payment-rails)** - Details on SEPA, ACH, Wire, PIX, and other payment methods
