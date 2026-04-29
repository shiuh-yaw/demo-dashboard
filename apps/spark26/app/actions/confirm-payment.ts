"use server";

import { headers } from "next/headers";
import { fetchCheckoutTransaction } from "@/lib/dynamic/server";
import { env } from "@/lib/env";
import { readOrReseed } from "@/lib/resolve-order-state";
import {
  readByConfirmation,
  transition,
} from "@/lib/store/order-store";
import { enqueueCventPostback } from "@/lib/upstash/qstash";
import type { OrderState, OrderStatus } from "@/lib/types/order-state";
import {
  assertSafeConfirmation,
  assertSafeTransactionId,
  sanitizeDisplayString,
} from "@/lib/validation";

// Confirmation is only valid from `tx_in_flight` — the caller
// (`markInFlightAction`) is what establishes the dynamicTransactionId binding
// that we replay-check against. Recovery of a lost Redis record is handled
// by forcing a fresh checkout, not by widening the accepted states here.
const NORMAL_EXPECTED: OrderStatus[] = ["tx_in_flight"];

// Base USDC is 6-decimal. amountDue is stored as a USD decimal string
// ("499.00"); USDC settles 1:1 to USD on Base so micro-units are the
// comparison currency for Dynamic's quote.toAmount.
const USDC_DECIMALS = 6;

export async function confirmPaymentAction(
  confirmation: string,
  args: {
    dynamicTransactionId: string;
    txHash: string;
    sourceChain?: string;
    sourceAsset?: string;
    sourceAssetLogo?: string;
  }
): Promise<OrderState> {
  // Validate untrusted inputs at the boundary before they flow into Redis
  // keys and external API URLs.
  const safeConfirmation = assertSafeConfirmation(confirmation);
  const safeTxId = assertSafeTransactionId(args.dynamicTransactionId);

  // `sourceAssetLogo` is client-supplied display metadata. We render it as an
  // <img> src on the confirmation screen, so reject anything that's not a
  // plain https URL to prevent javascript:/data: URL injection and limit the
  // size we'll persist to Redis.
  const sourceAssetLogo = sanitizeLogoUrl(args.sourceAssetLogo);
  const sourceChain = sanitizeDisplayString(args.sourceChain);
  const sourceAsset = sanitizeDisplayString(args.sourceAsset);
  // Distinguish "order was still in Redis" from "we had to re-seed it."
  // The existence of a prior record drives both the tx-id mismatch check
  // and the set of accepted starting states for the transition.
  const existing = await readByConfirmation(safeConfirmation);
  const current = existing ?? (await readOrReseed(safeConfirmation));
  if (!current) throw new Error(`Order ${safeConfirmation} not found`);
  const wasReseeded = existing === null;

  // Replay-hardening: enforced only when we have a stored dynamicTransactionId
  // to compare against.
  if (!wasReseeded && current.dynamicTransactionId !== safeTxId) {
    throw new Error(
      `Transaction ID mismatch for ${safeConfirmation}: does not match recorded transaction`,
    );
  }

  // On the recovery path we have no stored dynamicTransactionId to bind
  // against — accepting any client-provided id would let an attacker who
  // already completed their own payment close someone else's Cvent invoice
  // by asserting their tx id after a Redis flush. Dynamic's `toAddress`
  // check doesn't disambiguate because every order in this env settles to
  // the same destination wallet. Refuse; the user should start a fresh
  // checkout from `awaiting_payment` (which populates a new tx id via
  // `markInFlightAction`) rather than recover confirmation of an old one.
  if (wasReseeded) {
    throw new Error(
      `Order ${safeConfirmation} was reset — please refresh the page and start a fresh checkout.`,
    );
  }

  // Trust Dynamic as the source of truth: fetch the transaction server-side
  // and assert it actually settled. Skipping our own on-chain scan avoids the
  // brittleness of matching cross-chain bridge outputs by amount. Defense in
  // depth: also confirm the destination matches ours and the settled amount
  // is at least what we expect from the Cvent-resolved order.
  const dynamicTx = await fetchCheckoutTransaction(safeTxId);
  if (dynamicTx.settlementState !== "completed") {
    throw new Error(
      `Settlement not completed per Dynamic (settlementState=${dynamicTx.settlementState}, executionState=${dynamicTx.executionState})`,
    );
  }
  const ourDestination = env.SPARK26_DESTINATION_ADDRESS.toLowerCase();
  if (
    !dynamicTx.toAddress ||
    dynamicTx.toAddress.toLowerCase() !== ourDestination
  ) {
    throw new Error(
      `Destination mismatch: Dynamic reports ${dynamicTx.toAddress ?? "<none>"}, expected ${ourDestination}`,
    );
  }

  // Amount check — without this, an attacker can invoke the Dynamic SDK
  // directly with a checkout amount far below the real `amountDue`, pay a
  // penny, have Dynamic correctly report settlement, and the server would
  // mark Cvent's invoice paid in full. `quote.toAmount` is the floor of
  // what actually settled on Base in USDC micro-units.
  const actualMicro = dynamicTx.quote?.toAmount;
  if (!actualMicro) {
    throw new Error(
      `Dynamic transaction ${safeTxId} has no quote.toAmount — cannot verify settled amount`,
    );
  }
  // Prefer the locked USD figure when present (populated by createCheckoutAction
  // via lockRate). Legacy USD-only records written before the FX work have no
  // amountDueUsd; for those we compare against amountDue, which is already USD
  // by definition of the old supported-currency gate.
  const usdForCompare = current.amountDueUsd ?? current.amountDue;
  const expectedMicro = usdToMicroUsdc(usdForCompare);
  let actualBig: bigint;
  try {
    actualBig = BigInt(actualMicro);
  } catch {
    throw new Error(
      `Dynamic reported non-integer toAmount (${actualMicro}) — refusing`,
    );
  }
  if (actualBig < expectedMicro) {
    throw new Error(
      `Settled amount too low: Dynamic reports ${actualBig} µUSDC, expected at least ${expectedMicro} µUSDC`,
    );
  }

  const updated = await transition(
    safeConfirmation,
    NORMAL_EXPECTED,
    "tx_confirmed",
    {
      txHash: dynamicTx.txHash ?? args.txHash,
      sourceChain,
      sourceAsset,
      sourceAssetLogo,
    },
  );

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:4010";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  await enqueueCventPostback(`${protocol}://${host}`, safeConfirmation);

  return updated;
}

// Convert a USD decimal string ("499.00", "0.05") to USDC base units. Base
// USDC has 6 decimals and trades 1:1 to USD so the scaling is direct. We
// use a manual parse instead of `Number` × scaler to avoid floating-point
// rounding for amounts near edge cases.
function usdToMicroUsdc(usd: string): bigint {
  const [whole = "0", frac = ""] = usd.split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error(`Malformed amount: ${usd}`);
  }
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(fracPadded || "0");
}

// Accept only https URLs under 500 chars. The logo URL is client-supplied
// and rendered as <img src> on the confirmation screen, so we guard against
// javascript:/data: schemes and oversize payloads before persisting.
function sanitizeLogoUrl(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  if (raw.length > 500) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
