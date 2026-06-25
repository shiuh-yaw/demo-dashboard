/**
 * Merchant Iron-customer provisioning (SANDBOX ONLY).
 *
 * The /kyc-deposit demo settles every user deposit into ONE fixed merchant Iron
 * customer (IRON_MERCHANT_CUSTOMER_ID) — "money goes to a business's bank".
 * Iron forbids autoramp quotes for a customer that is not `Active`
 * (returns `403 "Get autoramp quote forbidden."`). A customer becomes active
 * only after: an approved identification, all required signings accepted, and a
 * registered (and, in sandbox, approved) bank account.
 *
 * `ensureMerchantProvisioned` drives that onboarding idempotently so the demo
 * works from just the merchant customer id + a USD (ACH) settlement account.
 * Every step tolerates "already done" responses, so it is safe to call on each
 * settlement. SANDBOX ONLY — production merchants onboard through Iron directly.
 *
 * The merchant settles in USD via ACH. USD offramps differ from SEPA/EUR:
 *  - bank registration requires a recipient email + phone;
 *  - the offramp quote uses `recipient_account_id` (the registered fiat-address
 *    id), so `ensureMerchantProvisioned` returns that id for the caller to quote
 *    with. (`recipient_account` / the IBAN path is EUR-only.)
 */

import type { IronFinanceClient } from "@dynamic-demos/iron";

interface MerchantProvisionInput {
  customerId: string;
  /** ACH routing number for the merchant's USD settlement account. */
  routingNumber: string;
  /** ACH account number for the merchant's USD settlement account. */
  accountNumber: string;
}

/** Sandbox placeholder phone for the merchant's USD (ACH) recipient. */
const MERCHANT_PHONE = "+14155550100";

/** Best-effort: approve any pending identifications for the customer. */
async function approvePendingIdentifications(
  client: IronFinanceClient,
  customerId: string,
): Promise<void> {
  try {
    const ids = await client.identifications.list(customerId);
    const list = Array.isArray(ids) ? ids : [];
    if (list.length === 0) {
      // No identification yet — start one (Link) then sandbox-approve it.
      const started = await client.kyc.start({ customer_id: customerId });
      if (started?.id) await client.identifications.updateStatus(started.id, true);
      return;
    }
    for (const ident of list) {
      if (ident.status !== "Approved") {
        await client.identifications.updateStatus(ident.id, true);
      }
    }
  } catch {
    // Identification may already be satisfied (customer past this stage).
  }
}

/** Best-effort: accept every required signing (Terms & Conditions, etc.). */
async function acceptRequiredSignings(
  client: IronFinanceClient,
  customerId: string,
): Promise<void> {
  try {
    const required = await client.signings.listRequired(customerId);
    const reqs = Array.isArray(required) ? required : [];
    for (const r of reqs) {
      await client.signings.create(customerId, {
        content_id: r.id,
        content_type: r.type ?? (r.url ? "Url" : "Text"),
        signed: true,
      });
    }
  } catch {
    // 409 "customer does not require signings" — already accepted.
  }
}

/**
 * Ensure the merchant has a registered + approved USD (ACH) bank account and
 * return its fiat-address id (needed as `recipient_account_id` when quoting).
 * Reuses an existing ACH account if one is already registered.
 */
async function ensureMerchantBank(
  client: IronFinanceClient,
  { customerId, routingNumber, accountNumber }: MerchantProvisionInput,
): Promise<string | undefined> {
  const existing = await client.bank.list(customerId);
  const ach = (existing.data ?? []).find(
    (b) =>
      (b as { account_identifier?: { type?: string } }).account_identifier
        ?.type === "ACH",
  );
  if (ach?.id) return ach.id;

  // USD/ACH registration requires a recipient email + phone.
  const customer = (await client.customers.get(customerId)) as unknown as {
    email?: string;
  };
  const registered = await client.bank.register({
    customer_id: customerId,
    currency: "USD",
    account_holder_name: "Merchant Settlement",
    account_number: accountNumber,
    routing_number: routingNumber,
    bank_name: "Merchant Settlement Bank",
    bank_country: "US",
    street: "1 Market St",
    city: "San Francisco",
    state: "CA",
    country: "US",
    postal_code: "94105",
    label: "merchant-settlement-usd",
    email: customer?.email || "merchant@example.com",
    phone: MERCHANT_PHONE,
  });
  if (registered?.id) {
    await client.sandbox.approveFiatAddress(registered.id);
  }
  return registered?.id;
}

/**
 * Idempotently onboard the fixed merchant customer to `Active` so offramp
 * quotes succeed, and ensure a USD settlement account exists. Returns the
 * registered fiat-address id to quote with. Safe to call before every
 * settlement. SANDBOX ONLY.
 */
export async function ensureMerchantProvisioned(
  client: IronFinanceClient,
  input: MerchantProvisionInput,
): Promise<{ fiatAddressId: string | undefined }> {
  // Up to two passes: identification → signings can each move the status.
  for (let pass = 0; pass < 2; pass++) {
    // The Iron API returns a `status` field (e.g. "SigningsRequired", "Active")
    // that the package's `Customer` type does not yet model.
    const customer = (await client.customers.get(input.customerId)) as unknown as {
      status?: string;
    };
    if (customer?.status === "Active") break;
    await approvePendingIdentifications(client, input.customerId);
    await acceptRequiredSignings(client, input.customerId);
  }
  const fiatAddressId = await ensureMerchantBank(client, input);
  return { fiatAddressId };
}
