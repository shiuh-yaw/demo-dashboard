# SPARK26 Microsite — Rehearsal Checklist

Manual end-to-end verification against the Cvent mock event + Base mainnet.
Run **2 weeks before SPARK26**, **1 week before**, and **day-before**.

## Prerequisites

- `apps/spark26/.env` populated with real values (Cvent prod creds pointing at the mock event, Dynamic API key, Upstash Redis + QStash, destination wallet, `CRON_SECRET`, `SPARK26_ADMIN_SECRET`, WalletConnect project ID).
- Deployed preview environment (or `pnpm dev:spark26` for local smoke).
- Test wallets funded with ≥ $2 USDC equivalent on Base / Solana / Bitcoin mainnet.

## Happy-path tests

### 1. EVM (MetaMask on Base)

- [ ] Create a test order in the Cvent mock event with a known confirmation number, amount $1.00.
- [ ] Open `https://<preview-domain>/?confirmation=<number>` in an incognito window.
- [ ] Verify attendee name + `$1.00` render in `PaymentView`.
- [ ] Click **Start** → `CheckoutShell` appears.
- [ ] Connect MetaMask (Base mainnet), hold ≥ 1 USDC.
- [ ] Complete the Dynamic checkout flow — select source, review quote, submit.
- [ ] Watch the page transition: `PaymentView` → `PendingView` → `ConfirmationView` within ~60s.
- [ ] Verify `ConfirmationView` shows correct amount + Basescan link + Cvent reference.
- [ ] Open Cvent mock event → confirm the order has a new **Offline Charge** transaction with `referenceNumber` starting `spark26:<confirmation>:0x…`.

### 2. Solana (Phantom)

- [ ] Repeat step 1 with a different confirmation + Phantom wallet on Solana mainnet.
- [ ] Verify Cvent transaction created, source-chain display reads `solana`.

### 3. Bitcoin (Unisat or Xverse)

- [ ] Repeat with a Bitcoin wallet (Unisat or Xverse).
- [ ] Verify the settlement lands in USDC on Base despite BTC source (Dynamic's orchestration).

### 4. EUR-priced order (dynamic FX conversion)

- [ ] Create a test order in the Cvent mock event priced in **EUR** (e.g. €1.00).
- [ ] Open the confirmation link. Verify `PaymentView` shows `€1.00` as the primary amount and **no** USD sublabel (FX fields haven't been locked yet).
- [ ] Click **Start**. Verify `PaymentView` re-renders with `≈ $X.XX USD · rate X.XXXX · locked <date UTC>` sublabel; cross-check the rate roughly against a live EUR/USD quote (±1%).
- [ ] Complete the payment from a Base-holding wallet. Verify settlement amount matches the displayed USD figure.
- [ ] Open the Cvent mock event. Verify the order closes in **full EUR** (attendee's Orders & Payments page shows €1.00 paid — Cvent does not see the USD amount).
- [ ] Open `/admin`. Verify the row shows `€1.00` on top and `$X.XX USD @ X.XXXX` beneath.

## Return-flow tests

### 5. Refresh mid-payment

- [ ] Start a payment flow, get to `tx_in_flight` state.
- [ ] Close the tab, reopen the link.
- [ ] Verify `PendingView` renders (not `PaymentView` — that would indicate state loss).
- [ ] Wait for terminal state, verify correct transition to `ConfirmationView`.

### 6. Reopen after paid

- [ ] Revisit a confirmed confirmation number.
- [ ] Verify `ConfirmationView` renders on first paint (hybrid resolver should hit Redis cache, not re-query Cvent).

### 7. Not-found

- [ ] Visit `/?confirmation=ZZZZZZZ0000000000000000` (synthetic).
- [ ] Verify `LookupErrorView` renders with masked confirmation string.

### 8. Cancelled order

- [ ] Cancel a mock-event order in Cvent.
- [ ] Wait for the next reconcile cron run (≤5 min) OR hit the link directly.
- [ ] Verify `CancelledOrderView` renders.

## Operational tests

### 9. Reconcile cron

- [ ] Manually `curl -H "Authorization: Bearer $CRON_SECRET" <preview>/api/internal/reconcile`.
- [ ] Verify 200 response with `{ scanned: N, actions: [...] }`.
- [ ] Verify cron fires automatically every 5 minutes in Vercel logs.

### 10. QStash Cvent-post retry

- [ ] Temporarily break the Cvent client (e.g., rotate `CVENT_CLIENT_SECRET` to an invalid value in preview env).
- [ ] Run a payment — order should reach `tx_confirmed` but Cvent post-back fails.
- [ ] Verify QStash retries with exponential backoff (up to 5 attempts).
- [ ] Restore the correct secret → next retry succeeds → state flips to `paid`.

### 11. Debug route

- [ ] `curl -H "Authorization: Bearer $SPARK26_ADMIN_SECRET" <preview>/api/debug/<confirmation>`.
- [ ] Verify JSON response with `{ order, cvent }`.
- [ ] With wrong auth header → verify 404 (not 401 — route presence not advertised).

## Sign-off

| Date | Tester | Result |
|---|---|---|
|  |  |  |

Record any follow-up issues as GitHub/Linear items. Do **not** commit real confirmation numbers, wallet addresses, or txHashes here — describe in general terms.
