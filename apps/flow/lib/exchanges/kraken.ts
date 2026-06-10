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
 * and registering it in index.ts.
 *
 * @module lib/exchanges/kraken
 */

import { KrakenLogo } from "@dynamic-demos/ui";
import {
  getKrakenAccounts,
  getKrakenWhitelistedAddresses,
  createKrakenExchangeTransfer,
} from "@/lib/dynamic/flow-sdk";
import { transformKrakenToTokenAssets } from "@dynamic-demos/checkouts-widget";
import type { ExchangeAdapter, ExchangeTransferParams } from "./types";

function getKrakenErrorMessage(err: unknown): string {
  const body = (err as { body?: { error?: string } })?.body;
  if (body?.error) return body.error;
  return err instanceof Error ? err.message : String(err);
}

export const krakenAdapter: ExchangeAdapter = {
  key: "kraken",
  name: "Kraken Exchange",
  iconComponent: KrakenLogo,
  socialProvider: "kraken",
  websiteUrl: "https://www.kraken.com",

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

      const matchingDestination = data.destinations?.find(
        (d) => d.address?.toLowerCase() === destinationAddress.toLowerCase(),
      );

      const addressWhitelisted = !!matchingDestination;
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

      return {
        transferId: response.id,
        status: response.status,
        amount: response.amount,
        currency: response.currency,
      };
    } catch (err: unknown) {
      const message = getKrakenErrorMessage(err);
      console.error("[KrakenAdapter] createTransfer failed:", message);
      throw new Error(message);
    }
  },
};
