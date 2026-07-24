/**
 * URL-param destination override for the flow scenarios.
 *
 * `network` maps onto lib/tokens.ts via findTokenByAssetChain; the
 * settlement asset stays the scenario asset (USDC). `to_address` must
 * match the resolved chain family or the override is rejected, so a
 * malformed link falls back to the scenario default instead of bricking
 * the demo. These values only ever become Flow API arguments, so format
 * validation is the whole security surface.
 */

import type { Token } from "@dynamic-demos/checkouts-widget";
import { chainFamilyForId, findTokenByAssetChain } from "./tokens";

export interface DestinationOverride {
  address: string;
  token: Token;
  chainFamily: string;
  networkKey: string;
}

type Params =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function getParam(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const raw = params[key];
  if (Array.isArray(raw)) return raw[0];
  return raw ?? undefined;
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const SOL_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidAddressForFamily(
  address: string,
  family: string,
): boolean {
  if (family === "SOL") return SOL_ADDRESS.test(address);
  if (family === "EVM") return EVM_ADDRESS.test(address);
  // A new chain family added to lib/tokens.ts must opt in here; reject
  // rather than validate an unknown family against the EVM regex.
  return false;
}

/** Checkout + Deposit: both params honored. */
export function resolveDestinationOverride(
  params: Params,
  assetSymbol: string,
): DestinationOverride | null {
  const networkKey = getParam(params, "network");
  const address = getParam(params, "to_address");
  if (!networkKey || !address) return null;

  const token = findTokenByAssetChain(assetSymbol, networkKey);
  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[destination-override] unknown network "${networkKey}" for ${assetSymbol}`,
      );
    }
    return null;
  }

  const chainFamily = chainFamilyForId(token.chainId);
  if (!isValidAddressForFamily(address, chainFamily)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[destination-override] to_address does not match ${chainFamily} family`,
      );
    }
    return null;
  }

  return { address, token, chainFamily, networkKey };
}

/** KYC Deposit: network locked by the caller; only to_address honored. */
export function resolveAddressOverride(
  params: Params,
  family: string,
): string | null {
  const address = getParam(params, "to_address");
  if (!address) return null;
  if (!isValidAddressForFamily(address, family)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[destination-override] to_address does not match ${family} family`,
      );
    }
    return null;
  }
  return address;
}
