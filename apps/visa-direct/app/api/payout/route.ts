import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { env } from "@/lib/env";
import { sendPayout } from "@/lib/api/visa-direct";
import {
  type VisaDirectPayoutRequest,
  mapVisaDirectToFireblocksOrder,
} from "@/lib/api/payload-mapper";
import { createOrder } from "@/lib/api/fireblocks";
import { PAYOUT_SIMULATION_MAX_USD } from "@/lib/constants";

/**
 * POST /api/payout
 *
 * IMPORTANT — demo data separation:
 *
 * The Visa Direct sendPayout schema requires PII-shaped fields (recipient
 * and sender names + physical addresses). For the *real* Fireblocks API
 * call we only propagate the fields Fireblocks actually needs: wallet
 * address, amount, and reference ID.
 *
 * Mock identity data ("Sarah Chen", "Airbnb Inc", San Francisco addresses
 * etc.) is *never* sent to Fireblocks. That demo data only lives in the
 * Phase 4 API payload drawer, which rebuilds both payloads client-side
 * from cached `TransactionRecord`s for visualization purposes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      amount?: unknown;
      walletAddress?: unknown;
      firstName?: unknown;
      lastName?: unknown;
    };

    const amount =
      typeof body.amount === "number"
        ? body.amount
        : parseFloat(String(body.amount ?? "0"));
    const walletAddress =
      typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    // Server-side safety net so a DOM tweak can't launch a larger
    // Fireblocks transfer than the demo-limit the modal enforces.
    // Source of truth lives in `lib/constants.ts`.
    if (amount > PAYOUT_SIMULATION_MAX_USD) {
      return NextResponse.json(
        {
          error: `Amount exceeds demo limit of ${PAYOUT_SIMULATION_MAX_USD} USDC per payout`,
        },
        { status: 400 },
      );
    }
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing walletAddress" },
        { status: 400 },
      );
    }

    // Only trust name fields if the client actually populated them (Google
    // SSO path). Email-OTP users never supply a name — we intentionally
    // leave those fields blank rather than fabricating one.
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";

    // Step 1: Visa Direct sendPayout (stub — always succeeds in ~1500ms)
    const visaResponse = await sendPayout({
      amount,
      recipientWallet: walletAddress,
      blockchain: "ETHEREUM",
      asset: "USDC",
    });

    // Step 2: Build the Visa Direct sendPayout payload with only the
    // fields the downstream mapper consumes (wallet address, amount,
    // clientReferenceId). The name fields are blank unless the user
    // authenticated via Google SSO. No physical-address / mock data is
    // constructed here.
    const visaPayload: VisaDirectPayoutRequest = {
      recipientDetail: {
        firstName,
        lastName,
        type: "I",
        address: {
          country: "",
          city: "",
          postalCode: "",
          addressLine1: "",
          state: "",
        },
        cryptoWallet: {
          blockchain: "ETHEREUM",
          address: walletAddress,
          asset: "USDC",
          tag: "",
        },
      },
      senderDetail: {
        firstName: "",
        lastName: "",
        senderReferenceNumber: visaResponse.transactionId,
        type: "B",
        address: {
          country: "",
          city: "",
          postalCode: "",
          addressLine1: "",
          state: "",
        },
      },
      payoutMethod: "CW",
      transactionDetail: {
        transactionAmount: amount,
        transactionCurrencyCode: "USD",
        endToEndId: randomUUID(),
        clientReferenceId: visaResponse.transactionId,
      },
    };

    // Step 3: Map Visa Direct → Fireblocks Orders API.
    // - via: PROVIDER_ACCOUNT using the MTLco connected account
    // - Execution: MARKET SELL — give USD (base), receive USDC (quote)
    // - Settlement: PREFUNDED → ONE_TIME_ADDRESS (recipient wallet)
    //
    // All three Fireblocks config values are validated as required in
    // lib/env.ts — no hardcoded fallbacks here. The Travel Rule note is
    // intentionally omitted (Fireblocks compliance screening handles
    // that at the workspace level, and we don't want demo-shaped
    // identity data leaking into a production API call).
    const orderRequest = mapVisaDirectToFireblocksOrder(
      visaPayload,
      env.FIREBLOCKS_VAULT_ACCOUNT_ID,
      env.FIREBLOCKS_PROVIDER_ID,
      env.FIREBLOCKS_ASSET_ID,
    );

    // Step 4: Submit order to Fireblocks (or mock when credentials absent)
    const fbResult = await createOrder(orderRequest);

    return NextResponse.json({
      success: true,
      visaDirectTxId: visaResponse.transactionId,
      fireblocksId: fbResult.id,
      fireblocksStatus: fbResult.status,
    });
  } catch (err) {
    console.error("[POST /api/payout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payout failed" },
      { status: 500 },
    );
  }
}
