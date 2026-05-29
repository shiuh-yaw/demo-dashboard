/**
 * Address pattern Dynamic's Checkout API requires for `destinations[].identifier`:
 * 18–100 chars, alphanumerics + underscore only. Exposed here so the
 * UI can validate before round-tripping the server route — and so
 * `route.ts` and the form validation share one source of truth.
 */
export const DYNAMIC_DESTINATION_ADDRESS_PATTERN = /^[A-Za-z0-9_]{18,100}$/;

/**
 * Client-side helper for `POST /api/checkouts` — mints a Flow Checkout
 * server-side and returns the `checkoutId` for the widget to mount.
 *
 * Used by BOTH `/withdraw` flows that need a per-transaction Checkout:
 *
 *   - WithdrawSubFlow: destination = user-entered external address.
 *     Caller passes `mode: "withdraw"` and the settlement chain/asset
 *     the user picked (e.g. USDC on Base).
 *
 *   - DepositSubFlow (the platform-wallet variant inside /withdraw):
 *     destination = the user's embedded SOL wallet address. Caller
 *     passes `mode: "deposit"` and the SOL/USDC settlement so funds
 *     land in the embedded wallet as USDC on Solana.
 *
 * The `/checkout` and `/deposit` standalone routes reuse a pre-baked
 * Checkout id and do NOT call this — their destinations are fixed
 * (merchant vault, platform vault) and don't vary per user.
 *
 * Keep this thin: just a fetch wrapper with a typed return + a useful
 * error message. The actual API surface is documented in
 * `app/api/checkouts/route.ts`.
 */

export interface CreateDestinationCheckoutInput {
  /** Address funds settle to. Validated upstream against the SDK's
   *  18–100 char alphanumeric+underscore pattern. */
  destinationAddress: string;
  /** Chain family of the destination — drives the upstream
   *  `destinations[].chainName`. */
  destinationChain: "EVM" | "SOL";
  /** Flow mode label. Threads through to the upstream Checkout's
   *  `mode` field so the dashboard can distinguish withdraw vs.
   *  deposit transactions in audit views. */
  mode: "withdraw" | "deposit";
  /** Settlement asset symbol — defaults to "USDC" if omitted. */
  asset?: string;
  /** Settlement chain key — defaults to "base" if omitted. Must be a
   *  key recognized by `chainIdFor`/`settlementTokenAddressFor` in
   *  `lib/flow-snippets.ts` (e.g. "base", "ethereum", "solana"). */
  chain?: string;
}

export async function createDestinationCheckout(
  input: CreateDestinationCheckoutInput,
): Promise<string> {
  const res = await fetch("/api/checkouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let detail = "Failed to create Checkout";
    try {
      const json = (await res.json()) as { error?: string };
      if (json?.error) detail = json.error;
    } catch {
      // ignore parse errors; fall through to the default message.
    }
    throw new Error(detail);
  }
  const json = (await res.json()) as { checkoutId?: string };
  if (!json?.checkoutId) {
    throw new Error("Checkout creation returned no id");
  }
  return json.checkoutId;
}
