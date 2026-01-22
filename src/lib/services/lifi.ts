/**
 * LI.FI Service
 *
 * Centralized LI.FI API interactions for routes and status checking.
 */

import { env } from "@/env";

const LIFI_API_BASE = "https://li.quest/v1";

export interface LiFiRouteRequest {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
}

export interface LiFiRouteOptions {
  order?: "CHEAPEST" | "FASTEST";
  slippage?: number;
  maxPriceImpact?: number;
  integrator?: string;
  fee?: number;
}

export interface LiFiStatusResult {
  status: "PENDING" | "DONE" | "FAILED" | "NOT_FOUND";
  substatus?: string;
  error?: string;
  /** LI.FI explorer URL for the transaction */
  lifiExplorerLink?: string;
  /** Bridge-specific explorer URL (if available) */
  bridgeExplorerLink?: string;
  /** Source chain transaction link */
  sendingTxLink?: string;
  /** Destination chain transaction link */
  receivingTxLink?: string;
}

class LiFiService {
  private apiKey: string;
  private integrator: string;
  private integratorFee: number;

  constructor() {
    this.apiKey = env.LIFI_API_KEY;
    this.integrator = "dynamic-widget-demo";
    this.integratorFee = 0.05; // 5%
  }

  /**
   * Get swap routes from LI.FI
   */
  async getRoutes(
    request: LiFiRouteRequest,
    options: LiFiRouteOptions = {}
  ): Promise<{ routes: unknown; integrator: string }> {
    const response = await fetch(`${LIFI_API_BASE}/advanced/routes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-lifi-api-key": this.apiKey,
      },
      body: JSON.stringify({
        ...request,
        options: {
          order: options.order || "CHEAPEST",
          slippage: options.slippage || 0.005,
          maxPriceImpact: options.maxPriceImpact || 0.01,
          integrator: options.integrator || this.integrator,
          fee: options.fee ?? this.integratorFee,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new LiFiError(
        errorData.message || `LI.FI API error: ${response.status}`,
        response.status
      );
    }

    const data = await response.json();
    return {
      routes: data,
      integrator: this.integrator,
    };
  }

  /**
   * Check transaction status from LI.FI
   */
  async getStatus(
    txHash: string,
    fromChainId?: number,
    toChainId?: number
  ): Promise<LiFiStatusResult> {
    const params = new URLSearchParams({ txHash });
    if (fromChainId) params.set("fromChain", fromChainId.toString());
    if (toChainId) params.set("toChain", toChainId.toString());

    try {
      const response = await fetch(`${LIFI_API_BASE}/status?${params}`, {
        headers: {
          "x-lifi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { status: "NOT_FOUND" };
        }
        throw new Error(`LI.FI API error: ${response.status}`);
      }

      const data = await response.json();
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
      console.error("[LiFiService] Failed to check status:", error);
      // Treat errors as pending for retry
      return { status: "PENDING" };
    }
  }

  /**
   * Get the integrator name for SDK configuration
   */
  getIntegrator(): string {
    return this.integrator;
  }
}

export class LiFiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "LiFiError";
  }
}

// Singleton instance
export const lifiService = new LiFiService();
