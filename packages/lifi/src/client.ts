/**
 * LI.FI REST client.
 *
 * Thin wrapper around the public REST API at `https://li.quest/v1`. The
 * full LI.FI SDK (`@lifi/sdk`) is consumed separately on the client side
 * for `executeRoute`; this package keeps the server-side surface focused
 * on quote fetching and status polling so dashboard handlers stay thin.
 */

import { resolveLifiApiUrl, type LifiEnvironment } from "./env";
import type {
  LifiQuoteOptions,
  LifiQuoteRequest,
  LifiQuoteResponse,
  LifiRoute,
  LifiStatusResult,
  LifiStep,
} from "./types";

export interface LifiClient {
  readonly env: LifiEnvironment;
  readonly apiUrl: string;
  readonly apiKey: string;
  readonly integrator: string;
  readonly defaultFee: number;
}

export interface CreateLifiClientOptions {
  env: LifiEnvironment;
  /** LI.FI API key (`x-lifi-api-key`). */
  apiKey: string;
  /** Integrator string sent on every quote request. */
  integrator: string;
  /** Default integrator fee (0–1). */
  defaultFee?: number;
  /** Override the REST host (used by tests). */
  apiUrl?: string;
}

/**
 * Build a LI.FI REST client.
 *
 * Per D-005 every public function takes `env`. The package never reads
 * `process.env` — callers (dashboard service, etc.) wire credentials in.
 */
export function createLifiClient(options: CreateLifiClientOptions): LifiClient {
  return {
    env: options.env,
    apiUrl: options.apiUrl ?? resolveLifiApiUrl(options.env),
    apiKey: options.apiKey,
    integrator: options.integrator,
    defaultFee: options.defaultFee ?? 0.05,
  };
}

export class LifiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "LifiError";
  }
}

function getHeaders(client: LifiClient): Record<string, string> {
  return {
    "x-lifi-api-key": client.apiKey,
  };
}

/**
 * Fetch a swap quote from LI.FI.
 *
 * Uses `/quote/toAmount` for reverse quotes — "merchant wants to receive X
 * destination tokens; how much does the user need to send?".
 */
export async function getQuote(
  client: LifiClient,
  request: LifiQuoteRequest,
  options: LifiQuoteOptions = {},
): Promise<LifiQuoteResponse> {
  const params = new URLSearchParams({
    fromChain: request.fromChainId.toString(),
    toChain: request.toChainId.toString(),
    fromToken: request.fromTokenAddress,
    toToken: request.toTokenAddress,
    toAmount: request.toAmount,
    fromAddress: request.fromAddress,
    toAddress: request.toAddress,
    order: options.order ?? "FASTEST",
    slippage: (options.slippage ?? 0.005).toString(),
    maxPriceImpact: (options.maxPriceImpact ?? 0.01).toString(),
    integrator: options.integrator ?? client.integrator,
    fee: (options.fee ?? client.defaultFee).toString(),
  });

  const url = `${client.apiUrl}/quote/toAmount?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(client),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new LifiError(
      errorData.message ?? `LI.FI quote failed: ${response.status}`,
      response.status,
    );
  }

  const quote = (await response.json()) as LifiStep;

  // The /quote endpoint returns a single Step object — wrap it as a
  // single-step Route so consumers can hand it to the SDK's
  // executeRoute() unmodified.
  const route: LifiRoute = {
    id: quote.id,
    fromChainId: quote.action.fromChainId,
    toChainId: quote.action.toChainId,
    fromToken: quote.action.fromToken,
    toToken: quote.action.toToken,
    fromAmount: quote.action.fromAmount,
    toAmount: quote.estimate.toAmount,
    fromAmountUSD: quote.estimate.fromAmountUSD ?? "0",
    toAmountUSD: quote.estimate.toAmountUSD ?? "0",
    gasCostUSD: quote.estimate.gasCosts?.[0]?.amountUSD ?? "0",
    steps: [quote],
    fromAddress: request.fromAddress,
    toAddress: request.toAddress,
  };

  return {
    route,
    integrator: client.integrator,
  };
}

/**
 * Poll LI.FI for the current status of a transaction.
 *
 * Errors are deliberately swallowed and surfaced as `PENDING` so callers
 * (worker / status endpoints) keep retrying instead of marking the
 * transaction failed on a transient outage.
 */
export async function getStatus(
  client: LifiClient,
  txHash: string,
  fromChainId?: number,
  toChainId?: number,
): Promise<LifiStatusResult> {
  const params = new URLSearchParams({ txHash });
  if (fromChainId) params.set("fromChain", fromChainId.toString());
  if (toChainId) params.set("toChain", toChainId.toString());

  try {
    const response = await fetch(`${client.apiUrl}/status?${params}`, {
      headers: getHeaders(client),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { status: "NOT_FOUND" };
      }
      const errorText = await response.text();
      throw new Error(
        `LI.FI status check failed: ${response.status} - ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      status: LifiStatusResult["status"];
      substatus?: string;
      substatusMessage?: string;
      lifiExplorerLink?: string;
      bridgeExplorerLink?: string;
      sending?: { txLink?: string };
      receiving?: { txLink?: string };
    };
    return {
      status: data.status,
      substatus: data.substatus,
      error: data.substatusMessage,
      lifiExplorerLink: data.lifiExplorerLink,
      bridgeExplorerLink: data.bridgeExplorerLink,
      sendingTxLink: data.sending?.txLink,
      receivingTxLink: data.receiving?.txLink,
    };
  } catch (error) {
    console.error("[lifi] Failed to check status:", error);
    return { status: "PENDING" };
  }
}
