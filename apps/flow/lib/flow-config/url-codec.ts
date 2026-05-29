/**
 * Decode a FlowConfig from URL search params.
 *
 * The scenario routes accept overlays like
 *   /checkout?source=external-wallet&dest=fireblocks-vault&asset=USDC
 *           &chain=base&mode=fixed&amount=5&currency=USD
 * and reconstruct a partial FlowConfig at render time. Only fields
 * present in the URL override the scenario's default.
 */

import { flowConfigSchema, type ParsedFlowConfig } from "./schema";

export function decodeFlowConfigFromParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): Partial<ParsedFlowConfig> {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      const value = params.get(key);
      return value ?? undefined;
    }
    const raw = (params as Record<string, string | string[] | undefined>)[key];
    if (Array.isArray(raw)) return raw[0];
    return raw ?? undefined;
  };

  const overlay: Partial<ParsedFlowConfig> = {};

  const source = get("source");
  if (source) {
    overlay.source = { type: source as ParsedFlowConfig["source"]["type"] };
  }

  const destination = get("dest") ?? get("destination");
  const destinationAddress = get("destAddress");
  const destinationVault = get("destVault");
  if (destination) {
    overlay.destination = {
      type: destination as ParsedFlowConfig["destination"]["type"],
      ...(destinationAddress ? { address: destinationAddress } : {}),
      ...(destinationVault ? { vaultAccountId: destinationVault } : {}),
    };
  }

  const assetSymbol = get("asset");
  const assetChain = get("chain");
  if (assetSymbol || assetChain) {
    overlay.asset = {
      symbol: assetSymbol ?? "USDC",
      chain: assetChain ?? "base",
    };
  }

  const mode = get("mode");
  const amountValue = get("amount");
  const currency = get("currency");
  if (mode || amountValue || currency) {
    overlay.amount = {
      mode: (mode as "fixed" | "user-input") ?? "fixed",
      ...(amountValue ? { fixedAmount: amountValue } : {}),
      ...(currency ? { fixedCurrency: currency } : {}),
    };
  }

  return overlay;
}

export function mergeFlowConfig(
  base: ParsedFlowConfig,
  overlay: Partial<ParsedFlowConfig>,
): ParsedFlowConfig {
  const merged = {
    ...base,
    ...overlay,
    source: { ...base.source, ...overlay.source },
    destination: { ...base.destination, ...overlay.destination },
    asset: { ...base.asset, ...overlay.asset },
    amount: { ...base.amount, ...overlay.amount },
    compliance: { ...base.compliance, ...overlay.compliance },
  };
  return flowConfigSchema.parse(merged);
}
