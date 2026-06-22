/**
 * Address pattern Dynamic's Flow API requires for `destinations[].identifier`:
 * 18–100 chars, alphanumerics + underscore only. Exposed here so the
 * UI can validate before round-tripping the server route — and so
 * `route.ts` and the form validation share one source of truth.
 */
export const DYNAMIC_DESTINATION_ADDRESS_PATTERN = /^[A-Za-z0-9_]{18,100}$/;

export interface Settlement {
  chainName: string;
  chainId: string;
  symbol: string;
  tokenAddress: string;
  tokenDecimals: number;
}

export interface Destination {
  chainName: string;
  type: string;
  identifier: string;
}

export interface CreateFlowInput {
  mode: "payment" | "deposit" | "withdraw";
  amount: string;
  currency: string;
  settlementConfig: {
    strategy?: string;
    settlements: Settlement[];
  };
  destinationConfig: {
    destinations: Destination[];
  };
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

/** Build a `Settlement` entry from a Token + chain family name. */
export function settlementFromToken(
  token: { address: string; chainId: number; symbol: string; decimals: number },
  chainName: string,
): Settlement {
  return {
    chainName,
    chainId: String(token.chainId),
    symbol: token.symbol,
    tokenAddress: token.address,
    tokenDecimals: token.decimals,
  };
}

/** Build a `Destination` entry. */
export function destination(
  chainName: string,
  identifier: string,
): Destination {
  return { chainName, type: "address", identifier };
}
