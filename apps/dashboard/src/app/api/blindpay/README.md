# BlindPay API

Standardized API endpoints for BlindPay integration, enabling stablecoin to fiat (payouts) and fiat to stablecoin (payins) conversions.

## Overview

BlindPay is a global payment infrastructure that enables worldwide money transfers using both traditional fiat currencies and stablecoins. These APIs provide a standardized interface following demo-dashboard patterns.

**Reference**: [BlindPay Documentation](https://www.blindpay.com/docs/getting-started/overview)

## Authentication

All endpoints require Dynamic authentication:

- **Header**: `Authorization: Bearer <JWT>`
- **Header**: `x-dynamic-environment-id: <environment-id>`

The authenticated user's embedded wallet address is automatically extracted from the JWT token.

## API Structure

```
/api/blindpay/
├── payouts/
│   ├── quote/          # POST - Create payout quote
│   ├── execute/        # POST - Execute payout after approval
│   └── [id]/           # GET - Get payout status
├── payins/
│   ├── quote/          # POST - Create payin quote
│   ├── execute/         # POST - Execute payin after deposit
│   └── [id]/           # GET - Get payin status
└── rates/              # GET - Get exchange rates
```

## Payout Flow (Stablecoin → Fiat)

Convert stablecoins from your wallet to fiat currency in a bank account.

### Step 1: Create Payout Quote

**Endpoint**: `POST /api/blindpay/payouts/quote`

**Request Body**:
```json
{
  "bank_account_id": "ba_...",
  "currency_type": "sender",
  "cover_fees": false,
  "request_amount": 100.00,
  "network": "base_sepolia",
  "token": "USDC"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "quote_id": "quote_...",
    "request_amount": 100.00,
    "receiver_amount": 99.50,
    "fee": 0.50,
    "network": "base_sepolia",
    "token": "USDC",
    "estimated_completion_time": 1234567890,
    "quote": { ... }
  }
}
```

### Step 2: Approve Tokens & Execute

1. **Frontend**: Approve tokens using the amount from the quote
2. **API Call**: Execute the payout

**Endpoint**: `POST /api/blindpay/payouts/execute`

**Request Body**:
```json
{
  "quote_id": "quote_...",
  "approval_tx_hash": "0x..." // Optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "payout_id": "payout_...",
    "status": "processing",
    "receiver_amount": 99.50,
    "estimated_completion_time": 1234567890,
    "approval_tx_hash": "0x...",
    "payout": { ... }
  }
}
```

### Check Status

**Endpoint**: `GET /api/blindpay/payouts/[id]`

**Response**:
```json
{
  "success": true,
  "data": {
    "payout_id": "payout_...",
    "status": "completed",
    "receiver_amount": 99.50,
    "estimated_completion_time": 1234567890,
    "payout": { ... }
  }
}
```

## Payin Flow (Fiat → Stablecoin)

Convert fiat currency from a bank account to stablecoins in your wallet.

### Step 1: Create Payin Quote

**Endpoint**: `POST /api/blindpay/payins/quote`

**Request Body**:
```json
{
  "blockchain_wallet_id": "bw_...",
  "currency_type": "sender",
  "cover_fees": false,
  "request_amount": 100.00,
  "payment_method": "ach",
  "token": "USDC"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "payin_quote_id": "payin_quote_...",
    "request_amount": 100.00,
    "receiver_amount": 99.50,
    "fee": 0.50,
    "token": "USDC",
    "blindpay_bank_details": {
      "account_number": "123456789",
      "routing_number": "987654321",
      "account_type": "checking",
      "bank_name": "Example Bank"
    },
    "memo_code": "ABC123",
    "quote": { ... }
  }
}
```

### Step 2: Deposit Fiat & Execute

1. **User**: Deposit fiat to the bank account provided in quote
2. **API Call**: Execute the payin

**Endpoint**: `POST /api/blindpay/payins/execute`

**Request Body**:
```json
{
  "payin_quote_id": "payin_quote_..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "payin_id": "payin_...",
    "status": "processing",
    "blindpay_bank_details": { ... },
    "memo_code": "ABC123",
    "payin": { ... }
  }
}
```

### Check Status

**Endpoint**: `GET /api/blindpay/payins/[id]`

## Exchange Rates

**Endpoint**: `GET /api/blindpay/rates`

**Query Parameters**:
- `from` (required): USDC, USDT, or USDB
- `to` (required): USD, BRL, MXN, COP, ARS, or stablecoin
- `amount` (required): Amount to convert
- `currency_type` (required): "sender" or "receiver"
- `bank_account_id` (optional): For full quote
- `network` (optional): Required if bank_account_id provided
- `cover_fees` (optional): Default false

**Response**:
```json
{
  "success": true,
  "data": {
    "from": "USDC",
    "to": "USD",
    "rate": 1.0,
    "timestamp": 1234567890,
    "blindpay_rate": 0.998,
    "commercial_rate": 1.0,
    "flat_fee": 0,
    "percentage_fee": 0.002,
    "result_amount": 998,
    "request_amount": 1000,
    "quote_type": "fx"
  }
}
```

## Supported Options

### Networks
- `base_sepolia` (Base Sepolia Testnet)
- `base` (Base Mainnet)
- `ethereum` (Ethereum Mainnet)
- `arbitrum` (Arbitrum One)
- `polygon` (Polygon)
- `stellar` (Stellar)
- `tron` (Tron)

### Stablecoins
- `USDC` (USD Coin)
- `USDT` (Tether)
- `USDB` (Blast USD)

### Fiat Currencies
- `USD` (US Dollar)
- `BRL` (Brazilian Real)
- `MXN` (Mexican Peso)
- `COP` (Colombian Peso)
- `ARS` (Argentine Peso)

### Payment Methods (Payins)
- `ach` (ACH Transfer)
- `wire` (Wire Transfer)
- `pix` (PIX - Brazil)
- `sepa` (SEPA - Europe)

## Error Handling

All endpoints follow demo-dashboard error patterns:

- **400**: Validation error (missing/invalid parameters)
- **401**: Authentication error (missing/invalid JWT)
- **404**: Resource not found
- **500**: Internal server error

Error responses:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE", // Optional
  "details": { ... }    // Optional
}
```

## Service Layer

The BlindPay client is implemented in `src/lib/services/blindpay.ts`:

```typescript
import { blindpayClient } from "@/lib/services/blindpay";

// Create payout quote
const quote = await blindpayClient.createPayoutQuote({
  bank_account_id: "...",
  currency_type: "sender",
  cover_fees: false,
  request_amount: 10000, // in cents
  network: "base_sepolia",
  token: "USDC",
});
```

## Environment Variables

Required environment variables (configured in `src/env.ts`):

- `BLINDPAY_API_URL` (defaults to `https://api.blindpay.com/v1`)
- `BLINDPAY_INSTANCE_ID` (required)
- `BLINDPAY_API_KEY` (required)

## Test Accounts & Sandbox Environment

### Testnet Support

BlindPay supports testnet networks for development and testing:

- **Base Sepolia** (`base_sepolia`) - Recommended for testing
- Use testnet stablecoins (e.g., test USDC on Base Sepolia)

### Test Instance

The example codebase includes a KYC invite URL with instance ID `in_sZgM6Bl4Ma9Q`, which may be a test/demo instance:

```
https://app.blindpay.com/e/receivers/invite?instanceId=in_sZgM6Bl4Ma9Q&type=individual&kyc_type=standard&token=...
```

**Note**: This instance ID may be for testing purposes. Confirm with BlindPay support whether:
- This is a shared test instance
- You need to create your own test instance
- There's a separate sandbox environment

### Getting Test Credentials

To obtain test account credentials:

1. **Contact BlindPay**: Reach out to BlindPay support or sales to request test/sandbox access
2. **Check Dashboard**: Log into your BlindPay dashboard to see if test instances are available
3. **Documentation**: Review BlindPay docs for sandbox/test environment setup

### Testing Checklist

When testing with BlindPay:

- [ ] Use testnet networks (e.g., `base_sepolia`)
- [ ] Use test stablecoins (not mainnet tokens)
- [ ] Complete KYC verification in test environment
- [ ] Add test bank accounts (if required)
- [ ] Verify test instance ID and API key are configured
- [ ] Test payout flow with small amounts
- [ ] Test payin flow with test deposits

## Flow Diagrams

### Payout Flow
```
User → Create Quote → Approve Tokens → Execute Payout → Check Status
       (Step 1)        (Frontend)      (Step 2)         (Optional)
```

### Payin Flow
```
User → Create Quote → Deposit Fiat → Execute Payin → Check Status
       (Step 1)        (Bank)         (Step 2)        (Optional)
```

## Notes

- **Amounts**: All amounts in API requests are in dollars. The service layer automatically converts to cents for BlindPay API calls.
- **Wallet Address**: Automatically extracted from authenticated user's JWT token (embedded wallet).
- **Two-Step Flow**: Both payouts and payins require a two-step process (quote → execute).
- **Quote Expiration**: Quotes typically expire after 5 minutes. Create a new quote if expired.
- **Status Polling**: Use the status endpoints to check transaction progress.

## Related Documentation

- [BlindPay Getting Started](https://www.blindpay.com/docs/getting-started/overview)
- [BlindPay Payouts](https://www.blindpay.com/docs/essentials/payouts)
- [BlindPay Payins](https://www.blindpay.com/docs/essentials/payins)
- [Demo Dashboard BlindPay Page](/blindpay) - UI documentation page

