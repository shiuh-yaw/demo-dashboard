import type { DynamicJwtPayload } from "@dynamic-demos/dynamic";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/**
 * Session hints from the verified Dynamic JWT (`dynamic_jwt` cookie), read on the server.
 * Lets the client skip embedded-wallet discovery on resume when the JWT already lists it.
 */
export type DepositSessionBootstrap = {
  /** Cookie was present and Dynamic JWT passed JWKS verification. */
  hasVerifiedJwt: boolean;
  /**
   * EVM embedded address from JWT `verified_credentials` (`wallet_provider === "embeddedWallet"`).
   * Omit when missing or not a 0x-prefixed EVM address.
   */
  embeddedWalletAddressFromJwt: string | null;
};

/**
 * Derive {@link DepositSessionBootstrap} from a verified JWT payload (or null if unauthenticated).
 */
export function getDepositSessionBootstrapFromJwtPayload(
  user: DynamicJwtPayload | null,
): DepositSessionBootstrap {
  if (!user) {
    return { hasVerifiedJwt: false, embeddedWalletAddressFromJwt: null };
  }

  const raw =
    user.verified_credentials?.find(
      (c) => c.wallet_provider === "embeddedWallet",
    )?.address ?? "";
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed || !EVM_ADDRESS.test(trimmed)) {
    return { hasVerifiedJwt: true, embeddedWalletAddressFromJwt: null };
  }

  return {
    hasVerifiedJwt: true,
    embeddedWalletAddressFromJwt: trimmed,
  };
}
