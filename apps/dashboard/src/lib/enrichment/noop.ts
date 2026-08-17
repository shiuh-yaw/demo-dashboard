/** Fallback provider - always a miss. Used when ANTHROPIC_API_KEY is unset. */
import type { EnrichmentProvider } from "./types";

export const noopEnrichmentProvider: EnrichmentProvider = {
  name: "noop",
  async enrich() {
    return null;
  },
};
