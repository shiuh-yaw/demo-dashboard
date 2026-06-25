/**
 * Iron Finance Sandbox Merchant Offramp API Route
 *
 * Drives the /kyc-deposit demo's "money goes to the merchant's bank" leg in
 * SANDBOX. There is ONE fixed merchant Iron customer (IRON_MERCHANT_CUSTOMER_ID)
 * that receives every user deposit; this route turns a deposit into a real
 * sandbox offramp and simulates it through to settlement (the sandbox deposit
 * address is not monitored on-chain — see iron-sandbox-testing.md).
 *
 * The merchant settles in USD via ACH (USDC → USD, ≈1:1).
 *
 *   POST  → create an offramp for the merchant + simulate the deposit:
 *           provision → quote → offramp.create → authorize → createTransaction
 *           → approveAutoramp
 *   GET   → list the merchant's demo deposits (the live Deposit Activity feed)
 *
 * SANDBOX ONLY. Requires IRON_MERCHANT_CUSTOMER_ID (+ optional
 * IRON_MERCHANT_BANK_ROUTING_NUMBER / IRON_MERCHANT_BANK_ACCOUNT_NUMBER, which
 * default to public ACH sandbox fixtures).
 */

import { NextRequest } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import {
  type FiatCurrency,
  type IronAutorampResponse,
} from "@dynamic-demos/iron";
import { getIronClient } from "@/lib/iron/client";
import { ensureMerchantProvisioned } from "@/lib/iron/merchant";
import { env } from "@/env";
import { z } from "zod";

const simulateSchema = z.object({
  /** Deposited USDC amount as a decimal string (e.g. "1", "25.5"). */
  amountUsdc: z.string().min(1, "amountUsdc is required"),
  /** Depositor's wallet address — shown as "From" in the feed (optional). */
  fromAddress: z.string().optional(),
});

// The autoramp resource does not return converted amounts or the depositor, but
// Iron persists and echoes `external_id`. We stamp the deposit's display data
// there at creation so the feed can recover it straight from Iron (no separate
// store). Format: `kycdep|<usdc>|<fiat>|<currency>|<fromAddress>|<feeUsdc>`.
const DEPOSIT_TAG = "kycdep";

function encodeDepositMeta(meta: {
  amountUsdc: string;
  fiatAmount: string;
  fiatCurrency: string;
  fromAddress?: string;
  feeUsdc?: string;
  networkFeeUsdc?: string;
  serviceFeeUsdc?: string;
}): string {
  return [
    DEPOSIT_TAG,
    meta.amountUsdc,
    meta.fiatAmount,
    meta.fiatCurrency,
    meta.fromAddress ?? "",
    meta.feeUsdc ?? "",
    meta.networkFeeUsdc ?? "",
    meta.serviceFeeUsdc ?? "",
  ].join("|");
}

function decodeDepositMeta(externalId?: string | null) {
  if (!externalId || !externalId.startsWith(`${DEPOSIT_TAG}|`)) return null;
  const [
    ,
    amountUsdc,
    fiatAmount,
    fiatCurrency,
    fromAddress,
    feeUsdc,
    networkFeeUsdc,
    serviceFeeUsdc,
  ] = externalId.split("|");
  // Require a well-formed numeric amount — guards against any partial/legacy
  // tags so the feed only shows genuine deposits.
  if (!amountUsdc || Number.isNaN(Number(amountUsdc))) return null;
  return {
    amountUsdc,
    fiatAmount,
    fiatCurrency,
    feeUsdc: feeUsdc || null,
    networkFeeUsdc: networkFeeUsdc || null,
    serviceFeeUsdc: serviceFeeUsdc || null,
    fromAddress: fromAddress || null,
  };
}

function merchantConfig() {
  return {
    customerId: env.IRON_MERCHANT_CUSTOMER_ID,
    routingNumber: env.IRON_MERCHANT_BANK_ROUTING_NUMBER,
    accountNumber: env.IRON_MERCHANT_BANK_ACCOUNT_NUMBER,
    currency: (env.IRON_MERCHANT_OFFRAMP_CURRENCY || "USD") as FiatCurrency,
  };
}

export async function POST(req: NextRequest) {
  try {
    const client = getIronClient();
    if (!client.isSandbox()) {
      return createResponse(
        { error: "This endpoint is only available in sandbox mode" },
        403,
      );
    }

    const { customerId, routingNumber, accountNumber, currency } =
      merchantConfig();
    if (!customerId || !routingNumber || !accountNumber) {
      return createResponse(
        {
          error:
            "Merchant Iron customer not configured (set IRON_MERCHANT_CUSTOMER_ID + IRON_MERCHANT_BANK_ROUTING_NUMBER + IRON_MERCHANT_BANK_ACCOUNT_NUMBER)",
        },
        503,
      );
    }

    const { amountUsdc, fromAddress } = simulateSchema.parse(await req.json());
    const sourceAmountMicro = Math.round(parseFloat(amountUsdc) * 1_000_000);

    // 0. Ensure the merchant customer is onboarded to `Active` (approved KYC +
    //    accepted signings + registered/approved USD bank). Iron forbids quotes
    //    for non-active customers (403). Idempotent — safe on every settlement.
    //    USD offramp quotes reference the registered fiat-address id.
    const { fiatAddressId } = await ensureMerchantProvisioned(client, {
      customerId,
      routingNumber,
      accountNumber,
    });
    if (!fiatAddressId) {
      return createResponse(
        { error: "Could not provision the merchant settlement account" },
        502,
      );
    }

    // 1. Quote + create the offramp on the merchant customer (USDC → USD).
    const quote = await client.offramp.quote({
      customer_id: customerId,
      source_currency: "USDC",
      destination_currency: currency,
      source_amount: sourceAmountMicro,
      bank_account_id: fiatAddressId,
      recipient_account_id: fiatAddressId,
      blockchain: "Base",
    });
    // quote amounts/fees are in minor units (cents); convert to decimals.
    const fiatAmount = (quote.destination_amount / 100).toFixed(2);
    const feeUsdc = (quote.fees.total_fee / 100).toFixed(5);
    const networkFeeUsdc = ((quote.fees.network_fee ?? 0) / 100).toFixed(5);
    const serviceFeeUsdc = ((quote.fees.service_fee ?? 0) / 100).toFixed(5);
    const offramp = await client.offramp.create({
      quote_id: quote.id,
      customer_id: customerId,
      bank_account_id: fiatAddressId,
      routing_number: routingNumber,
      account_number: accountNumber,
      blockchain: "Base",
      source_currency: "USDC",
      destination_currency: currency,
      external_id: encodeDepositMeta({
        amountUsdc,
        fiatAmount,
        fiatCurrency: currency,
        fromAddress,
        feeUsdc,
        networkFeeUsdc,
        serviceFeeUsdc,
      }),
    });

    // 2. Authorize the autoramp first — sandbox.createTransaction rejects an
    //    unauthorized autoramp ("Sandbox transaction requires an authorized
    //    autoramp."). Then simulate the on-chain deposit (the sandbox deposit
    //    address isn't monitored), approve the autoramp, and drive the
    //    transaction to Completed so the payout actually settles (otherwise it
    //    sticks at "Exchanging Funds" / ConversionInProgress).
    await client.sandbox.setAutorampStatus(offramp.id, "Authorized");
    const tx = await client.sandbox.createTransaction({
      autoramp_id: offramp.id,
      amount: amountUsdc,
      input_currency: { type: "Crypto", blockchain: "Base", token: "USDC" },
      initial_state: "Pending",
    });
    await client.sandbox.approveAutoramp(offramp.id);
    await client.sandbox.setTransactionState(tx.id, "Completed");

    return createResponse(
      { autorampId: offramp.id, transactionId: tx.id, status: "Completed" },
      201,
    );
  } catch (error) {
    return handleApiError(error, "iron/sandbox/merchant-offramp/create");
  }
}

export async function GET() {
  try {
    const client = getIronClient();
    const { customerId } = merchantConfig();
    // Not configured → empty feed (the demo falls back to its sample rows).
    if (!customerId) return createResponse([], 200);

    const result = await client.autoramps.list(customerId);
    const transactions = (result.items || [])
      .map((item: IronAutorampResponse) => ({
        item,
        meta: decodeDepositMeta(item.external_id),
      }))
      // Only surface real demo deposits (tagged via external_id), and drop
      // cancelled/rejected autoramps (Iron's DELETE cancels rather than removes,
      // so this is how "cleared" deposits disappear from the feed).
      .filter(
        ({ item, meta }) =>
          meta !== null &&
          !["Cancelled", "Rejected"].includes(item.status ?? ""),
      )
      .map(({ item, meta }) => ({
        ...item,
        type: item.kind?.toLowerCase() || "unknown",
        // Recovered from external_id — the autoramp omits these.
        amountUsdc: meta?.amountUsdc ?? null,
        fiatAmount: meta?.fiatAmount ?? null,
        fiatCurrency: meta?.fiatCurrency ?? null,
        feeUsdc: meta?.feeUsdc ?? null,
        networkFeeUsdc: meta?.networkFeeUsdc ?? null,
        serviceFeeUsdc: meta?.serviceFeeUsdc ?? null,
        fromAddress: meta?.fromAddress ?? null,
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );

    return createResponse(transactions, 200);
  } catch (error) {
    return handleApiError(error, "iron/sandbox/merchant-offramp/list");
  }
}
