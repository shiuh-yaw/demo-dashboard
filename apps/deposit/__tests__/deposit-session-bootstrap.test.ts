/**
 * Characterization tests for apps/deposit/lib/deposit-session-bootstrap.ts.
 *
 * Deposit has no middleware; its consolidate-able auth surface is this pure
 * function that derives session bootstrap state from a verified Dynamic JWT
 * payload (the cookie/JWT verification happens upstream in
 * @dynamic-demos/dynamic). This is the most stable contract to lock down
 * before Phase 1D refactors the auth pipeline.
 */

import { describe, expect, test } from "vitest";
import type { DynamicJwtPayload } from "@dynamic-demos/dynamic";
import { getDepositSessionBootstrapFromJwtPayload } from "../lib/deposit-session-bootstrap";

const VALID_EVM = "0x1111111111111111111111111111111111111111";
const VALID_EVM_MIXED_CASE = "0xAbCDeF1234567890abcdef1234567890abcdef12";

function buildPayload(
  credentials: Array<Partial<{
    address: string;
    wallet_provider: string;
  }>> = [],
): DynamicJwtPayload {
  return {
    verified_credentials: credentials,
  } as unknown as DynamicJwtPayload;
}

describe("getDepositSessionBootstrapFromJwtPayload — null payload", () => {
  test("null user -> hasVerifiedJwt=false, embeddedWalletAddressFromJwt=null", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(null);
    expect(result).toEqual({
      hasVerifiedJwt: false,
      embeddedWalletAddressFromJwt: null,
    });
  });
});

describe("getDepositSessionBootstrapFromJwtPayload — non-null payload", () => {
  test("payload without verified_credentials -> hasVerifiedJwt=true, address=null", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(buildPayload([]));
    expect(result.hasVerifiedJwt).toBe(true);
    expect(result.embeddedWalletAddressFromJwt).toBeNull();
  });

  test("payload with embeddedWallet credential having valid 0x EVM address", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([
        { wallet_provider: "embeddedWallet", address: VALID_EVM },
      ]),
    );
    expect(result).toEqual({
      hasVerifiedJwt: true,
      embeddedWalletAddressFromJwt: VALID_EVM,
    });
  });

  test("address is preserved as-is (not normalized to lowercase)", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([
        { wallet_provider: "embeddedWallet", address: VALID_EVM_MIXED_CASE },
      ]),
    );
    expect(result.embeddedWalletAddressFromJwt).toBe(VALID_EVM_MIXED_CASE);
  });

  test("trims whitespace around the address before validation", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([
        {
          wallet_provider: "embeddedWallet",
          address: `  ${VALID_EVM}  `,
        },
      ]),
    );
    expect(result.embeddedWalletAddressFromJwt).toBe(VALID_EVM);
  });

  test("non-embeddedWallet provider -> address ignored", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([{ wallet_provider: "metamask", address: VALID_EVM }]),
    );
    expect(result.hasVerifiedJwt).toBe(true);
    expect(result.embeddedWalletAddressFromJwt).toBeNull();
  });

  test("missing address on embeddedWallet credential -> null", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([{ wallet_provider: "embeddedWallet" }]),
    );
    expect(result.hasVerifiedJwt).toBe(true);
    expect(result.embeddedWalletAddressFromJwt).toBeNull();
  });

  test("non-EVM-format address (no 0x prefix) -> null", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([
        {
          wallet_provider: "embeddedWallet",
          address: "1111111111111111111111111111111111111111",
        },
      ]),
    );
    expect(result.embeddedWalletAddressFromJwt).toBeNull();
  });

  test("non-EVM address (no 0x prefix, base58-style) -> null", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([
        {
          wallet_provider: "embeddedWallet",
          // Intentionally low-entropy placeholder to avoid secret-scan false positives.
          address: "FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE",
        },
      ]),
    );
    expect(result.embeddedWalletAddressFromJwt).toBeNull();
  });

  test("0x... but wrong length -> null", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([
        {
          wallet_provider: "embeddedWallet",
          address: "0x123",
        },
      ]),
    );
    expect(result.embeddedWalletAddressFromJwt).toBeNull();
  });

  test("non-string address -> null (and does not throw)", () => {
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([
        {
          wallet_provider: "embeddedWallet",
          // intentionally wrong type to mirror real-world malformed payloads
          address: 12345 as unknown as string,
        },
      ]),
    );
    expect(result.hasVerifiedJwt).toBe(true);
    expect(result.embeddedWalletAddressFromJwt).toBeNull();
  });

  test("multiple credentials: picks the FIRST embeddedWallet entry", () => {
    const otherEvm = "0x2222222222222222222222222222222222222222";
    const result = getDepositSessionBootstrapFromJwtPayload(
      buildPayload([
        { wallet_provider: "metamask", address: otherEvm },
        { wallet_provider: "embeddedWallet", address: VALID_EVM },
        { wallet_provider: "embeddedWallet", address: otherEvm },
      ]),
    );
    expect(result.embeddedWalletAddressFromJwt).toBe(VALID_EVM);
  });
});
