/**
 * Shared utilities for LI.FI integration.
 *
 * Re-exports the canonical SDK-config helper from `@dynamic-demos/lifi`
 * under the legacy `configureLiFi` name so existing callers in this app
 * (`hooks/use-lifi/index.ts` etc.) keep importing from the same path.
 *
 * NOTE: All API calls (routes, status) go through the dashboard API.
 * The LI.FI SDK is ONLY used for swap execution (executeRoute).
 */

import { configureLifi } from "@dynamic-demos/lifi";

/**
 * Configure LI.FI SDK for route execution.
 *
 * Thin re-export of `configureLifi` from `@dynamic-demos/lifi`. See the
 * package for the full doc-comment; the integrator MUST match the value
 * the dashboard used when fetching the quote.
 */
export const configureLiFi = configureLifi;
