/**
 * Tolerant FlowConfig parser used by every scenario page.
 *
 * `searchParams` arrives as untrusted user input — we treat the URL
 * overlay as a hint and fall back to the scenario's default config
 * if the merge produces something the schema rejects. The fallback
 * uses `flowConfigSchema.parse` (not `safeParse`) so a broken default
 * fixture surfaces loudly at build / boot time rather than as a
 * silent runtime degradation.
 */

import { flowConfigSchema, type ParsedFlowConfig } from "./flow-config/schema";
import { DEFAULT_FLOW_CONFIGS } from "./flow-config/defaults";

/** Keys of `DEFAULT_FLOW_CONFIGS` — the three demo scenarios. */
export type FlowScenarioKey = keyof typeof DEFAULT_FLOW_CONFIGS;

export function parseFlowConfigSafely(
  raw: unknown,
  fallback: FlowScenarioKey,
): ParsedFlowConfig {
  const result = flowConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  return flowConfigSchema.parse(DEFAULT_FLOW_CONFIGS[fallback]);
}
