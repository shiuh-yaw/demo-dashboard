# Iron Sandbox Testing

How to exercise Iron flows end-to-end in **sandbox** (`env: "sandbox"`), where
there is **no real blockchain / bank settlement**. Sandbox-by-default per D-005.

> **The deposit address is not real.** When you create an offramp (or autoramp),
> Iron sandbox returns a `deposit_instructions.address` / `deposit_rails[].address`.
> In sandbox that address is **not monitored on-chain** — sending testnet crypto
> to it does nothing. To progress a transaction you must **simulate** the deposit
> with the `sandbox.*` namespace instead of sending funds.

All helpers live on `IronFinanceClient.sandbox` (and `MockIronClient.sandbox`).
They map 1:1 to Iron's `/api/sandbox/*` endpoints and **only work in sandbox**.

## KYC (instant approval)

Production KYC redirects the user to Iron's verification partner. In sandbox,
approve instantly:

```ts
// Approve the latest identification for a customer.
await client.sandbox; // see also POST /api/sandbox/identification/{id}
```

(Exposed via the dashboard as `POST /api/iron/sandbox/identification/[id]`.)

## Offramp / autoramp (the deposit you can't really send)

The production offramp is: create offramp → user sends crypto to the deposit
address → Iron detects it on-chain → converts → settles fiat to the bank.

In **sandbox**, replace "user sends crypto" with a simulated transaction:

```ts
// 1. Create the autoramp (or offramp) as usual — this returns the (fake)
//    deposit address and an autoramp/transaction id.
const autoramp = await client.autoramps.create({ /* … */ });

// 2. Simulate the on-chain deposit arriving for that autoramp.
//    This is the substitute for "user sends crypto to the deposit address".
const tx = await client.sandbox.createTransaction({
  autoramp_id: autoramp.id,
  amount: "100.000000", // in the autoramp's input currency
  input_currency: { type: "Crypto", blockchain: "Base", token: "USDC" },
  initial_state: "Pending",
});

// 3. (Optional) drive the transaction state directly.
await client.sandbox.setTransactionState(tx.id, "Completed");

// 4. Advance / approve the autoramp so it settles to fiat. `approveAutoramp`
//    is shorthand for setAutorampStatus(id, "Approved").
await client.sandbox.approveAutoramp(autoramp.id);
// or, to drive a specific state:
await client.sandbox.setAutorampStatus(autoramp.id, "DepositAccountAdded");
```

**Autoramp status progression** (`AutorampSandboxStatus`):
`Created → EditPending → Authorized → DepositAccountAdded → Approved`
(terminal failures: `Rejected`, `Cancelled`). These map to canonical states via
`ironAutorampStatusToCanonical` (see `state-mapping.ts`):
`Created/EditPending → pending`, `Authorized/DepositAccountAdded/Approved → processing`,
`Rejected → failed`, `Cancelled → cancelled`.

**Transaction state** (`TransactionSandboxState`): `Pending | Completed | Failed`.

## Fiat (bank) address verification

A new bank/fiat address may sit in `RegistrationPending`. Approve it in sandbox:

```ts
await client.sandbox.approveFiatAddress(fiatAddressId);
// or: setFiatAddressStatus(id, "Registered")
```

`FiatAddressSandboxStatus`: `RegistrationPending | Registered | RegistrationFailed
| AuthorizationRequired | AuthorizationFailed`.

## Reset between runs

```ts
await client.sandbox.reset(); // clears all sandbox data
```

## Customer must be `Active` before any quote

Iron **forbids autoramp quotes for a customer that is not `Active`** — the quote
fails with `403 "Get autoramp quote forbidden."` (no detail). A customer reaches
`Active` only after **all** of:

1. an **approved identification** (sandbox: `identifications.updateStatus(id, true)`);
2. **every required signing accepted** — there is usually a Terms & Conditions
   signing even for a fully KYC'd customer. The customer sits at
   `status: "SigningsRequired"` until then:
   ```ts
   for (const r of await client.signings.listRequired(customerId)) {
     await client.signings.create(customerId, {
       content_id: r.id,
       content_type: r.type ?? (r.url ? "Url" : "Text"),
       signed: true,
     });
   }
   ```

Check `customers.get(id).status` (the live API returns `status`, e.g.
`"SigningsRequired"` / `"Active"`, which the package's `Customer` type does not
yet model).

## Other offramp gotchas (learned the hard way)

- **Bank country must be EEA for SEPA.** `bank.register` defaults `bank_country`
  to `"US"` when omitted → `400 "Bank from non-SEPA country"`. Pass the IBAN's
  country (its first two chars), e.g. `bank_country: iban.slice(0, 2)`.
- **`bank_account_id` for offramp quote/create is the IBAN**, not the registered
  fiat-address id. Passing the fiat-address id gives `400 "Recipient account not
  found"` (Iron matches the IBAN to the registered SEPA address itself).
- **Authorize before simulating.** `sandbox.createTransaction` rejects a freshly
  created autoramp with `400 "Sandbox transaction requires an authorized
  autoramp."` — call `sandbox.setAutorampStatus(id, "Authorized")` first.
- **Minimum quote is 1 unit of the fiat currency** (e.g. `400 "Quote amount must
  be at least 1 EUR"`).

## USD (ACH) differs from EUR (SEPA)

USDC → USD settles ~1:1 (cleaner than EUR's odd sandbox rate), but the USD/ACH
path has extra requirements the package now handles (pass `email`/`phone` to
`bank.register`, `recipient_account_id` to `offramp.quote`, `routing_number` +
`account_number` to `offramp.create`):

- **Registration requires a recipient email + phone.** Omitting them →
  `400 "Email address is required for USD accounts"` / `"Phone number is
  required..."`. Note `email_address` is an **object** (`{ email }`), and the
  email must pass Iron's validator (a normal address like the customer's works;
  `*.local` is rejected).
- **The quote uses `recipient_account_id`, not `recipient_account`.** Pass the
  **registered fiat-address id** — using `recipient_account` gives `400 "Please
  use recipient_account_id instead..."`, and the fiat-id as `recipient_account`
  gives `400 "Recipient account not found"`. (This is the opposite of SEPA,
  where `recipient_account` = the IBAN.)
- **Create uses an inline ACH `account_identifier`** (routing + account); the
  account must already be registered + approved or you get `400 "recipient fiat
  account not verified"`.

## End-to-end sandbox offramp checklist

1. Create customer → `sandbox` approve KYC (`/api/iron/sandbox/identification/[id]`).
2. **Accept all required signings** until `customers.get(id).status === "Active"`.
3. Register the customer's bank account (SEPA `bank_country` = IBAN country) →
   `approveFiatAddress` if it isn't `Registered`.
4. Get an offramp quote (`bank_account_id` = the **IBAN**) → create the offramp.
5. **`setAutorampStatus(autorampId, "Authorized")`**, then
   **`createTransaction({ autoramp_id, amount })`** to simulate the crypto deposit
   (do NOT send real crypto to the returned deposit address).
6. `setTransactionState(txId, "Completed")` and/or `approveAutoramp(autorampId)`.
7. Poll `customers/{id}/autoramps` (or use webhooks) — the autoramp now reports
   `processing`/settled.

The `/kyc-deposit` demo automates steps 1–6 via
`apps/dashboard/src/lib/iron/merchant.ts` (`ensureMerchantProvisioned`) + the
`POST /api/iron/sandbox/merchant-offramp` route, so the merchant onboards itself
from just `IRON_MERCHANT_CUSTOMER_ID` + `IRON_MERCHANT_BANK_IBAN`.

## Dashboard exposure

Only `POST /api/iron/sandbox/identification/[id]` is currently wired in the
dashboard. The remaining `sandbox.*` operations
(`createTransaction`, `setTransactionState`, `approveAutoramp`,
`setAutorampStatus`, `approveFiatAddress`, `reset`) are available on the package
client but are **not yet exposed as dashboard routes** — add the corresponding
`/api/iron/sandbox/*` routes (proxying `getIronClient().sandbox.*`) before a demo
app can drive them.
