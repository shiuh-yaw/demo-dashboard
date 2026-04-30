/**
 * Friendly user-facing error messages for smart-account transactions.
 *
 * Consolidates the cases that were duplicated across `friendlyMintError`
 * (reports page) and `friendlyTransferError` (transfer modal). The context
 * tag lets us vary the subject noun ("payout" vs "transfer") without forking
 * the whole function.
 */

export type SmartTxContext = "payout" | "transfer";

const SUBJECT: Record<SmartTxContext, string> = {
  payout: "payout",
  transfer: "transfer",
};

export function friendlySmartTxError(
  err: unknown,
  context: SmartTxContext,
): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  const subject = SUBJECT[context];

  if (lower.includes("already in progress")) {
    return `A ${subject} is already processing. Wait for it to finish.`;
  }

  if (
    lower.includes("aa25") ||
    lower.includes("invalid account nonce") ||
    lower.includes("same sender and nonce") ||
    lower.includes("nonce too low") ||
    lower.includes("nonce too high")
  ) {
    return `A previous transaction is still settling onchain. Wait ~30 seconds and try again.`;
  }

  if (lower.includes("smart wallet") || lower.includes("evm wallet")) {
    return "Create your stablecoin wallet from Agreements, Tax, and Banking first.";
  }

  if (
    lower.includes("cancel") ||
    lower.includes("abort") ||
    lower.includes("not allowed") ||
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected")
  ) {
    return "Biometric confirmation was cancelled. Try again when ready.";
  }

  if (lower.includes("no mfa token") || lower.includes("mfa")) {
    return "Biometric MFA didn't complete. Confirm with Touch ID when prompted.";
  }

  if (lower.includes("passkey") || lower.includes("webauthn")) {
    return "Passkey not registered. Enable Touch ID for this wallet from the Security settings.";
  }

  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    lower.includes("gas required exceeds allowance")
  ) {
    if (context === "transfer") {
      return "Insufficient funds — the wallet doesn't have enough gas. Gas sponsorship may not be enabled for this environment.";
    }
    return "Wallet has no gas and sponsorship isn't enabled for this environment.";
  }

  if (
    lower.includes("exceeds balance") ||
    lower.includes("transfer amount exceeds balance") ||
    lower.includes("insufficientbalance")
  ) {
    return "Insufficient USDC balance for this transfer.";
  }

  if (
    lower.includes("sponsor") ||
    lower.includes("paymaster") ||
    lower.includes("sponsorship")
  ) {
    return "Gas sponsorship isn't set up for this Dynamic environment. Check the Dynamic dashboard's ZeroDev configuration.";
  }

  if (lower.includes("no zerodev provider") || lower.includes("zerodev provider found")) {
    const chainMatch = raw.match(/network id\s+(\d+)/i);
    const chain = chainMatch ? chainMatch[1] : null;
    return chain
      ? `ZeroDev is not configured for chain ${chain}. Enable it in the Dynamic dashboard under Embedded Wallets → Smart Wallets.`
      : "ZeroDev is not configured for this network. Enable it in the Dynamic dashboard under Embedded Wallets → Smart Wallets.";
  }

  if (
    lower.includes("timeout") ||
    lower.includes("failed to fetch") ||
    (lower.includes("network") && !lower.includes("network id"))
  ) {
    return `Network error during ${subject}. Check your connection and try again.`;
  }

  if (lower.includes("signer") || lower.includes("auth")) {
    return "Signing authorization failed. Confirm biometrics and try again.";
  }

  const capitalized = subject
    ? subject.charAt(0).toUpperCase() + subject.slice(1)
    : "Operation";
  return `${capitalized} failed: ${raw.slice(0, 180)}`;
}
