/**
 * Address pattern Dynamic's Flow API requires for `destinations[].identifier`:
 * 18–100 chars, alphanumerics + underscore only. Exposed here so the
 * UI can validate before round-tripping the server route — and so
 * `route.ts` and the form validation share one source of truth.
 */
export const DYNAMIC_DESTINATION_ADDRESS_PATTERN = /^[A-Za-z0-9_]{18,100}$/;

export interface CreateFlowInput {
  mode: "payment" | "deposit" | "withdraw";
  amount: string;
  currency: string;
  destinationAddress: string;
  destinationChain: "EVM" | "SOL";
  /** Settlement asset symbol — defaults to "USDC" if omitted. */
  asset?: string;
  /** Settlement chain key — defaults to "base". Must match `chainIdFor` in flow-snippets. */
  chain?: string;
}

/**
 * Client helper for `POST /api/checkouts` — creates a Flow server-side
 * once amount + destination are known. Returns the `flowId` for attach →
 * quote → submit on the client.
 */
export async function createFlow(input: CreateFlowInput): Promise<string> {
  const res = await fetch("/api/checkouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let detail = "Failed to create Flow";
    try {
      const json = (await res.json()) as { error?: string };
      if (json?.error) detail = json.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
  const json = (await res.json()) as { flowId?: string };
  if (!json?.flowId) {
    throw new Error("Flow creation returned no id");
  }
  return json.flowId;
}

/** @deprecated Use {@link createFlow}. */
export const createDestinationCheckout = async (
  input: Omit<CreateFlowInput, "amount" | "currency"> & {
    amount?: string;
    currency?: string;
  },
): Promise<string> => {
  if (!input.amount) {
    throw new Error("createFlow requires amount — mint after the user picks an amount");
  }
  return createFlow({
    ...input,
    amount: input.amount,
    currency: input.currency ?? "USD",
  });
};
