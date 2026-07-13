/**
 * Chains the send flow has panel content for. Neutral module (no React,
 * no shiki) so both the client panel-section context and the server
 * code-steps module can import it.
 */

export const SEND_CHAINS = ["EVM", "SOL", "SUI", "BTC", "TON"] as const;
export type SendChain = (typeof SEND_CHAINS)[number];

export function isSendChain(chain: string): chain is SendChain {
  return (SEND_CHAINS as readonly string[]).includes(chain);
}

/** Panel section for a send/scan screen on the given chain. */
export function sendSectionForChain(
  chain: string,
): `send-${SendChain}` | "default" {
  return isSendChain(chain) ? `send-${chain}` : "default";
}
