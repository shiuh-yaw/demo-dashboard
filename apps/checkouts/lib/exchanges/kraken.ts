/**
 * Kraken Exchange Adapter
 *
 * Encapsulates ALL Kraken-specific logic:
 * - Display config (name, icon, OAuth provider)
 * - Balance fetching via getKrakenAccounts
 * - Whitelisting checks via getKrakenWhitelistedAddresses
 * - Transfer execution via createKrakenExchangeTransfer
 *
 * Adding a new exchange means creating a file like this one
 * and registering it in index.ts. No other changes needed.
 *
 * @module lib/exchanges/kraken
 */

import { KrakenLogo } from "@dynamic-demos/ui";
import {
  getKrakenAccounts,
  getKrakenWhitelistedAddresses,
  createKrakenExchangeTransfer,
} from "@/lib/dynamicClient";
import { transformKrakenToTokenAssets } from "@/lib/balance-utils";
import type { ExchangeAdapter, ExchangeTransferParams } from "./types";

function getKrakenErrorMessage(err: unknown): string {
  const body = (err as { body?: { error?: string } })?.body;
  if (body?.error) return body.error;
  return err instanceof Error ? err.message : String(err);
}

export const krakenAdapter: ExchangeAdapter = {
  // Identity
  key: "kraken",
  name: "Kraken Exchange",
  iconComponent: KrakenLogo,
  socialProvider: "kraken",
  websiteUrl: "https://www.kraken.com",

  // Behavior
  async getBalances() {
    const accounts = await getKrakenAccounts();
    return transformKrakenToTokenAssets(accounts);
  },

  async checkWhitelisting(destinationAddress: string, currency?: string) {
    try {
      const data = await getKrakenWhitelistedAddresses();

      if (!data.enforcesAddressWhitelist) {
        return { required: false, isWhitelisted: true };
      }

      // Kraken whitelists by address + token pair.
      // Check that the address exists AND the specific currency is in its tokens list.
      const matchingDestination = data.destinations?.find(
        (d) => d.address?.toLowerCase() === destinationAddress.toLowerCase(),
      );

      const addressWhitelisted = !!matchingDestination;

      // If a currency is specified, also verify it's in the tokens list
      const currencyWhitelisted = currency
        ? (matchingDestination?.tokens?.includes(currency) ?? false)
        : addressWhitelisted;

      const isWhitelisted = addressWhitelisted && currencyWhitelisted;

      return { required: true, isWhitelisted };
    } catch (err) {
      console.error("[KrakenAdapter] checkWhitelisting error:", err);
      return { required: false, isWhitelisted: true };
    }
  },

  async createTransfer(params: ExchangeTransferParams) {
    // Find the account with sufficient balance for the requested currency
    const accounts = await getKrakenAccounts();

    let selectedAccountId: string | null = null;
    for (const account of accounts) {
      const balance = account.balances?.find(
        (b) =>
          b.currency === params.currency &&
          (b.availableBalance ?? b.balance) >= params.amount,
      );
      if (balance) {
        selectedAccountId = account.id;
        break;
      }
    }

    if (!selectedAccountId) {
      throw new Error(
        `Insufficient ${params.currency} balance on Kraken for this transfer.`,
      );
    }

    console.log("[KrakenAdapter] createTransfer:", {
      accountId: selectedAccountId,
      to: params.to,
      amount: params.amount,
      currency: params.currency,
      chainName: params.chainName,
      networkId: params.networkId,
    });

    try {
      const response = await createKrakenExchangeTransfer({
        accountId: selectedAccountId,
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        networkObject: {
          chainName: params.chainName as "EVM" | "SOL",
          networkId: params.networkId,
        },
        id: params.idempotencyKey,
        mfaCode: params.mfaCode,
      } as Parameters<typeof createKrakenExchangeTransfer>[0]);

      console.log("[KrakenAdapter] transfer response:", response);

      return {
        transferId: response.id,
        status: response.status,
        amount: response.amount,
        currency: response.currency,
      };
    } catch (err: unknown) {
      const message = getKrakenErrorMessage(err);
      console.error("[KrakenAdapter] createTransfer failed:", message, {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
      });
      throw new Error(message);
    }
  },
};
