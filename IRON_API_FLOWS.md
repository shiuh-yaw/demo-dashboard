# Iron API Flow Diagrams

Visual representations of the Iron API flows for quick understanding. These diagrams show the step-by-step process for onboarding users and executing transactions.

**For complete API details, see the [Official Iron Documentation →](https://docs.iron.xyz/)**

---

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          IRON API USER JOURNEY                          │
└─────────────────────────────────────────────────────────────────────────┘

1. ONBOARDING (One-time setup)
   │
   ├─ Step 1: Create Customer Profile
   │  └─ POST /api/iron/customers
   │     Input: email, name, DOB, country
   │     Output: customer_id ✓
   │
   ├─ Step 2: Complete KYC Verification
   │  ├─ POST /api/iron/customers/{id}/kyc
   │  │  Output: kyc_url → Redirect user
   │  └─ GET /api/iron/customers/{id}/identifications
   │     Check status: approved ✓
   │
   ├─ Step 3: Sign Documents (if required)
   │  ├─ GET /api/iron/customers/{id}/signings
   │  │  Check if documents needed
   │  └─ POST /api/iron/customers/{id}/signings
   │     Submit each signature ✓
   │
   ├─ Step 4: Register Crypto Wallet
   │  └─ POST /api/iron/wallets/self-hosted
   │     Input: address + signature
   │     Output: wallet_id ✓
   │
   └─ Step 5: Add Bank Account
      └─ POST /api/iron/banks
         Input: IBAN or account_number
         Output: bank_account_id ✓

2. ONRAMP (Fiat → Crypto)
   │
   ├─ Get Quote
   │  └─ POST /api/iron/quotes/onramp
   │     Output: quote_id, rate, amounts ✓
   │
   ├─ Execute Onramp
   │  └─ POST /api/iron/onramps
   │     Output: payment_instructions
   │
   ├─ User Sends Fiat
   │  └─ Transfer to virtual IBAN
   │     Include reference code
   │
   └─ Monitor Status
      └─ GET /api/iron/onramps/{id}
         pending_payment → payment_received → processing → completed ✓

3. OFFRAMP (Crypto → Fiat)
   │
   ├─ Get Quote
   │  └─ POST /api/iron/quotes/offramp
   │     Output: quote_id, rate, amounts ✓
   │
   ├─ Execute Offramp
   │  └─ POST /api/iron/offramps
   │     Output: deposit_instructions
   │
   ├─ User Sends Crypto
   │  └─ Send to deposit address
   │     Exact amount required
   │
   └─ Monitor Status
      └─ GET /api/iron/offramps/{id}
         pending_deposit → deposit_received → processing → completed ✓
```

---

## Onboarding Flow (Detailed)

```
┌──────────────┐
│   New User   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: CREATE CUSTOMER PROFILE                                    │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/iron/customers                                            │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "type": "individual",                                             │
│   "email": "user@example.com",                                      │
│   "first_name": "John",                                             │
│   "last_name": "Doe",                                               │
│   "country_code": "US",                                             │
│   "date_of_birth": "1990-01-15",                                    │
│   "phone_number": "+14155552671"                                    │
│ }                                                                   │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "id": "cus_abc123",  ← SAVE THIS                                 │
│   "status": "active"                                                │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: START KYC VERIFICATION                                     │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/iron/customers/cus_abc123/kyc                            │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "return_url": "https://yourdomain.com/onboard"                   │
│ }                                                                   │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "url": "https://kyc-provider.com/verify?token=...",              │
│   "identification_id": "idn_xyz789"  ← SAVE THIS                   │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │ Redirect User   │
                │ to KYC Provider │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  User Completes │
                │   Verification  │
                └────────┬────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ User Redirected Back │
              └──────────┬───────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CHECK KYC STATUS                                                    │
├─────────────────────────────────────────────────────────────────────┤
│ GET /api/iron/customers/cus_abc123/identifications                 │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "data": [{                                                        │
│     "id": "idn_xyz789",                                             │
│     "status": "approved" ✓                                          │
│   }]                                                                │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: CHECK & SIGN DOCUMENTS (If Required)                       │
├─────────────────────────────────────────────────────────────────────┤
│ GET /api/iron/customers/cus_abc123/signings                        │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "data": [                                                         │
│     {                                                               │
│       "id": "sig_123",                                              │
│       "content_id": "terms_of_service",                             │
│       "content_type": "Url",                                        │
│       "content": "https://example.com/terms.pdf",                   │
│       "status": "pending"                                           │
│     }                                                               │
│   ]                                                                 │
│ }                                                                   │
│                                                                     │
│ If data is empty, SKIP to Step 4                                   │
│ Otherwise, for each document:                                       │
│                                                                     │
│ POST /api/iron/customers/cus_abc123/signings                       │
│ {                                                                   │
│   "content_id": "terms_of_service",                                 │
│   "content_type": "Url",                                            │
│   "signed": true                                                    │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: REGISTER CRYPTO WALLET                                     │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Generate message:                                                │
│    "I am verifying ownership of the wallet address                 │
│     {address} as customer {customer_id}. This message              │
│     was signed on {date} to confirm my control over                │
│     this wallet."                                                   │
│                                                                     │
│ 2. User signs message with wallet                                  │
│                                                                     │
│ 3. POST /api/iron/wallets/self-hosted                              │
│    {                                                                │
│      "customer_id": "cus_abc123",                                   │
│      "blockchain": "base",                                          │
│      "wallet_address": "0x742d35Cc...",                             │
│      "message": "I am verifying...",                                │
│      "signature": "0x..."                                           │
│    }                                                                │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "id": "wal_def456",  ← SAVE THIS                                 │
│   "address": "0x742d35Cc...",                                       │
│   "status": "active"                                                │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: ADD BANK ACCOUNT                                           │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/iron/banks                                                │
│                                                                     │
│ For SEPA (Europe):                                                  │
│ {                                                                   │
│   "customer_id": "cus_abc123",                                      │
│   "currency": "EUR",                                                │
│   "account_holder_name": "John Doe",                                │
│   "iban": "DE89370400440532013000",                                 │
│   "bank_name": "Deutsche Bank",                                     │
│   "bank_country": "DE"                                              │
│ }                                                                   │
│                                                                     │
│ For ACH (USA):                                                      │
│ {                                                                   │
│   "customer_id": "cus_abc123",                                      │
│   "currency": "USD",                                                │
│   "account_holder_name": "John Doe",                                │
│   "account_number": "123456789",                                    │
│   "routing_number": "021000021",                                    │
│   "bank_name": "Chase Bank"                                         │
│ }                                                                   │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "id": "bnk_ghi789",  ← SAVE THIS                                 │
│   "status": "active"                                                │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │ ONBOARDING      │
                │   COMPLETE ✓    │
                └─────────────────┘
                          │
                          ▼
         User can now perform onramps and offramps
```

---

## Onramp Flow (Fiat → Crypto)

```
┌──────────────────┐
│ User Wants Crypto│
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: GET QUOTE                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/iron/quotes/onramp                                        │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "customer_id": "cus_abc123",                                      │
│   "source_currency": "EUR",                                         │
│   "destination_currency": "USDC",                                   │
│   "source_amount": 10000,  // €100.00 in cents                     │
│   "wallet_id": "wal_def456",                                        │
│   "payment_rail": "sepa"                                            │
│ }                                                                   │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "id": "quo_123",  ← SAVE THIS                                    │
│   "source_currency": "EUR",                                         │
│   "source_amount": 10000,        // €100.00                        │
│   "destination_currency": "USDC",                                   │
│   "destination_amount": 108500000, // 108.50 USDC                  │
│   "exchange_rate": "1.085",                                         │
│   "fee": 250,                     // €2.50                         │
│   "expires_at": "2025-01-15T10:35:00Z"  ⏰ 30 seconds              │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
            ┌──────────────────────────┐
            │  Show Quote to User      │
            │  - Amount: €100.00       │
            │  - Receive: 108.50 USDC  │
            │  - Fee: €2.50            │
            │  - Rate: 1.085           │
            │  [Confirm] [Cancel]      │
            └────────┬─────────────────┘
                     │
                     ▼ User confirms
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: EXECUTE ONRAMP                                              │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/iron/onramps                                              │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "quote_id": "quo_123",                                            │
│   "customer_id": "cus_abc123",                                      │
│   "wallet_id": "wal_def456"                                         │
│ }                                                                   │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "id": "onr_abc",  ← SAVE THIS                                    │
│   "status": "pending_payment",                                      │
│   "payment_instructions": {                                         │
│     "account_number": "DE89370400440532013000",                     │
│     "beneficiary_name": "Iron Tech GmbH",                           │
│     "bank_name": "Deutsche Bank",                                   │
│     "bic": "DEUTDEFF",                                              │
│     "reference": "ONR-ABC123"  ← IMPORTANT!                        │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
            ┌──────────────────────────┐
            │ Show Payment Instructions│
            │                          │
            │ Send €100.00 to:         │
            │ IBAN: DE8937040...       │
            │ BIC: DEUTDEFF            │
            │ Reference: ONR-ABC123    │
            │                          │
            │ ⚠️ Include reference!    │
            └────────┬─────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ User Opens Banking App│
         │ and Sends Transfer    │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: MONITOR STATUS                                              │
├─────────────────────────────────────────────────────────────────────┤
│ GET /api/iron/onramps/onr_abc                                       │
│                                                                     │
│ Status Flow:                                                        │
│                                                                     │
│ 1. "pending_payment"                                                │
│    ⏳ Waiting for bank transfer                                     │
│    (Can take 1-2 business days for SEPA)                            │
│                                                                     │
│ 2. "payment_received"                                               │
│    ✓ Bank transfer received                                         │
│    ⏳ Waiting for confirmations                                     │
│                                                                     │
│ 3. "processing"                                                     │
│    ⏳ Converting EUR to USDC                                        │
│    ⏳ Sending to wallet                                             │
│                                                                     │
│ 4. "completed" ✓                                                    │
│    ✅ USDC delivered to wallet!                                     │
│    Transaction complete                                             │
│                                                                     │
│ OR                                                                  │
│                                                                     │
│ "failed" ❌                                                          │
│    Transaction failed                                               │
│    (Check error message)                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Offramp Flow (Crypto → Fiat)

**What is an offramp?** An offramp converts cryptocurrency to traditional money (fiat) in your bank account. It's how users "cash out" their crypto.

**Example scenarios:**
- User has 100 USDC and wants €92 in their bank account
- User earned crypto and needs to pay rent in fiat
- User wants to reduce crypto exposure and hold fiat instead

```
┌──────────────────────────────────┐
│ User Wants to Cash Out Crypto   │
│ (Convert to fiat in bank)        │
└────────┬─────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: GET QUOTE                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/iron/quotes/offramp                                       │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "customer_id": "cus_abc123",                                      │
│   "source_currency": "USDC",                                        │
│   "destination_currency": "EUR",                                    │
│   "source_amount": 100000000,  // 100 USDC (6 decimals)            │
│   "bank_account_id": "bnk_ghi789"                                   │
│ }                                                                   │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "id": "quo_456",  ← SAVE THIS                                    │
│   "source_currency": "USDC",                                        │
│   "source_amount": 100000000,     // 100 USDC                      │
│   "destination_currency": "EUR",                                    │
│   "destination_amount": 9200,     // €92.00                        │
│   "exchange_rate": "0.92",                                          │
│   "fee": 100,                     // €1.00                         │
│   "expires_at": "2025-01-15T10:35:00Z"  ⏰ 30 seconds              │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
            ┌──────────────────────────┐
            │  Show Quote to User      │
            │  - Send: 100 USDC        │
            │  - Receive: €92.00       │
            │  - Fee: €1.00            │
            │  - Rate: 0.92            │
            │  [Confirm] [Cancel]      │
            └────────┬─────────────────┘
                     │
                     ▼ User confirms
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: EXECUTE OFFRAMP                                             │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/iron/offramps                                             │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "quote_id": "quo_456",                                            │
│   "customer_id": "cus_abc123",                                      │
│   "bank_account_id": "bnk_ghi789"                                   │
│ }                                                                   │
│                                                                     │
│ Response:                                                           │
│ {                                                                   │
│   "id": "off_xyz",  ← SAVE THIS                                    │
│   "status": "pending_deposit",                                      │
│   "deposit_instructions": {                                         │
│     "blockchain": "base",                                           │
│     "address": "0x1234567890abcdef...",                             │
│     "amount": "100.000000",  ← EXACT AMOUNT                        │
│     "currency": "USDC",                                             │
│     "memo": "OFF-XYZ789"                                            │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
            ┌──────────────────────────┐
            │ Show Deposit Instructions│
            │                          │
            │ Send EXACTLY:            │
            │ 100.000000 USDC          │
            │                          │
            │ To Address:              │
            │ 0x1234567890abcdef...    │
            │                          │
            │ Network: Base            │
            │ Memo: OFF-XYZ789         │
            │                          │
            │ ⚠️ Must send exact amount│
            └────────┬─────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ User Opens Wallet     │
         │ and Sends USDC        │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: MONITOR STATUS                                              │
├─────────────────────────────────────────────────────────────────────┤
│ GET /api/iron/offramps/off_xyz                                      │
│                                                                     │
│ Status Flow:                                                        │
│                                                                     │
│ 1. "pending_deposit"                                                │
│    ⏳ Waiting for crypto deposit                                    │
│                                                                     │
│ 2. "deposit_received"                                               │
│    ✓ Crypto received                                                │
│    ⏳ Waiting for blockchain confirmations                          │
│                                                                     │
│ 3. "processing"                                                     │
│    ⏳ Converting USDC to EUR                                        │
│    ⏳ Sending to bank account                                       │
│                                                                     │
│ 4. "completed" ✓                                                    │
│    ✅ EUR deposited to bank account!                                │
│    Transaction complete                                             │
│                                                                     │
│ OR                                                                  │
│                                                                     │
│ "failed" ❌                                                          │
│    Transaction failed                                               │
│    (Check error message)                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Transaction Cancellation Flow

```
┌────────────────────────────┐
│ User Wants to Cancel       │
│ (Before payment/deposit)   │
└──────────┬─────────────────┘
           │
           ▼
   ┌───────────────────┐
   │  Check Status     │
   └────────┬──────────┘
            │
            ▼
    ┌───────────────────────────────┐
    │ Is status "pending_payment"   │
    │ or "pending_deposit"?         │
    └───────┬─────────────┬─────────┘
            │ Yes         │ No
            ▼             ▼
┌───────────────────┐  ┌────────────────────┐
│ POST /api/iron/   │  │ Cannot cancel -    │
│ onramps/{id}/     │  │ payment already    │
│ cancel            │  │ received/processed │
│                   │  └────────────────────┘
│ or                │
│                   │
│ POST /api/iron/   │
│ offramps/{id}/    │
│ cancel            │
└────────┬──────────┘
         │
         ▼
┌────────────────────┐
│ Status: "cancelled"│
│ Transaction voided │
└────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────┐
│  API Call Made  │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ Success│?
    └──┬───┬─┘
       │   │
   Yes │   │ No
       │   │
       ▼   ▼
┌──────────┐  ┌────────────────────────────────────────┐
│ Return   │  │ Check HTTP Status Code                 │
│ Data     │  ├────────────────────────────────────────┤
└──────────┘  │ 400 Bad Request                        │
              │  → Validation error, fix request data  │
              │                                        │
              │ 401 Unauthorized                       │
              │  → Auth token missing/invalid          │
              │                                        │
              │ 404 Not Found                          │
              │  → Resource doesn't exist              │
              │                                        │
              │ 409 Conflict                           │
              │  → Duplicate resource                  │
              │                                        │
              │ 422 Unprocessable Entity               │
              │  → Business logic error                │
              │  → Quote expired, KYC not approved,    │
              │     insufficient funds, etc.           │
              │                                        │
              │ 429 Too Many Requests                  │
              │  → Rate limited, slow down             │
              │                                        │
              │ 500 Server Error                       │
              │  → Retry with exponential backoff      │
              └──────────────┬─────────────────────────┘
                             │
                             ▼
                  ┌──────────────────┐
                  │ Show User-Friendly│
                  │ Error Message    │
                  └──────────────────┘
```

---

## State Management Recommendation

```
┌──────────────────────────────────────────────────────────────┐
│                    PERSIST THESE VALUES                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Use localStorage, Redux, Zustand, or server-side sessions  │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ Onboarding State                             │           │
│  ├──────────────────────────────────────────────┤           │
│  │ - customer_id           (after Step 1)       │           │
│  │ - identification_id     (after KYC)          │           │
│  │ - wallet_id             (after Step 4)       │           │
│  │ - bank_account_id       (after Step 5)       │           │
│  │ - current_step          (for resume)         │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ Active Transactions                          │           │
│  ├──────────────────────────────────────────────┤           │
│  │ - active_onramp_id      (if pending)         │           │
│  │ - active_offramp_id     (if pending)         │           │
│  │ - pending_quote_id      (for quick execute)  │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ User Preferences                             │           │
│  ├──────────────────────────────────────────────┤           │
│  │ - preferred_currency    (EUR, USD, etc.)     │           │
│  │ - preferred_blockchain  (base, ethereum)     │           │
│  │ - default_wallet_id                          │           │
│  │ - default_bank_id                            │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Webhook Events Flow

```
Configure webhooks in Iron dashboard to receive real-time updates:

┌─────────────────────────────────────────────────────────────┐
│                     WEBHOOK EVENTS                          │
└─────────────────────────────────────────────────────────────┘

Onramp Events:
  onramp.created
    → Onramp initiated
  onramp.payment_received
    → Fiat received, processing
  onramp.processing
    → Converting fiat to crypto
  onramp.completed
    → Crypto sent to wallet ✓
  onramp.failed
    → Transaction failed ❌

Offramp Events:
  offramp.created
    → Offramp initiated
  offramp.deposit_received
    → Crypto received, processing
  offramp.processing
    → Converting crypto to fiat
  offramp.completed
    → Fiat sent to bank ✓
  offramp.failed
    → Transaction failed ❌

KYC Events:
  kyc.started
    → Verification begun
  kyc.approved
    → User verified ✓
  kyc.rejected
    → Verification failed ❌

Use webhooks instead of polling for better performance!
```

---

## Common Scenarios Explained

### Scenario 1: First-Time User Buying Crypto (Onramp)

**User Goal**: Sarah wants to buy 100 USDC with EUR from her bank account.

**Steps:**
1. **Onboarding** (one-time): Create customer → Complete KYC → Register wallet
2. **Get Quote**: Sarah sees "€100 = 108.50 USDC" (after fees)
3. **Execute**: System generates a virtual IBAN for Sarah to send money to
4. **Payment**: Sarah uses her banking app to transfer €100 to the IBAN with a reference code
5. **Wait**: SEPA transfer takes 1-2 business days
6. **Completion**: Iron receives the €100, converts to USDC, and sends 108.50 USDC to Sarah's wallet

### Scenario 2: User Cashing Out Crypto (Offramp)

**User Goal**: Marcus has 100 USDC and needs €92 in his bank to pay rent.

**Steps:**
1. **Prerequisites**: Marcus already completed onboarding and registered his bank account
2. **Get Quote**: Marcus sees "100 USDC = €92" (after conversion and fees)
3. **Execute**: System generates a deposit address on Base chain
4. **Send Crypto**: Marcus sends exactly 100 USDC from his wallet to the provided address
5. **Wait**: Blockchain confirmation takes 1-5 minutes
6. **Completion**: Iron receives the USDC, converts to EUR, and sends €92 to Marcus's bank account (arrives in 1-2 business days for SEPA)

### Scenario 3: Platform Subsidizing User Fees

**Platform Goal**: A rewards platform wants to cover user transaction fees.

**Steps:**
1. **Normal Flow**: User initiates an offramp to cash out rewards
2. **Third-Party Payment**: Platform creates a third-party payment to cover the fee
3. **User Experience**: User receives the full quoted amount without deductions
4. **Platform**: Platform pays the fees on behalf of the user as a benefit

---

## Understanding Key Concepts

### What is KYC?

**KYC (Know Your Customer)** is identity verification required by financial regulations. Users must prove their identity before making financial transactions. The process typically takes 1-5 minutes and involves:
- Uploading a government ID (passport, driver's license)
- Taking a selfie for facial recognition
- Providing basic information (name, date of birth, address)

### What are Payment Rails?

**Payment rails** are the different methods for sending fiat money:
- **SEPA** (Europe): Bank transfers in EUR, takes 1-2 business days
- **ACH** (USA): Bank transfers in USD, takes 1-3 business days
- **Wire**: International bank transfers, faster but more expensive
- **PIX** (Brazil): Instant transfers in BRL
- **Faster Payments** (UK): Fast GBP transfers

### Quote Expiration

Quotes expire quickly (typically 30 seconds) because cryptocurrency prices change constantly. If a user delays, they need to get a new quote with the current exchange rate.

---

For more details, see:
- **[Official Iron Documentation](https://docs.iron.xyz/)** - Complete API reference and guides
- **Full Documentation**: `IRON_API_DOCUMENTATION.md` - Detailed endpoint descriptions
- **API Creation Guide**: `API_CREATION_GUIDE.md` - How to build API routes
