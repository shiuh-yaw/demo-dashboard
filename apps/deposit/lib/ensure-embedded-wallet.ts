import {
  createWaasWalletAccounts,
  getWalletAccounts,
  isWaasWalletAccount,
} from "@/lib/dynamic";

/**
 * Ensures the current Dynamic session has an EVM embedded (WaaS) wallet.
 * If none exists, creates one via WaaS and re-reads accounts.
 *
 * @returns The embedded address, or `null` if creation failed or no WaaS account appeared.
 */
export async function ensureEmbeddedEvmWalletAddress(): Promise<string | null> {
  let accounts = getWalletAccounts();
  let embedded = accounts.find((a) =>
    isWaasWalletAccount({ walletAccount: a }),
  );

  if (!embedded) {
    try {
      await createWaasWalletAccounts({ chains: ["EVM"] });
    } catch (err) {
      console.error(
        "[ensure-embedded-wallet] createWaasWalletAccounts failed",
        err,
      );
      return null;
    }
    accounts = getWalletAccounts();
    embedded = accounts.find((a) => isWaasWalletAccount({ walletAccount: a }));
  }

  return embedded?.address ?? null;
}
