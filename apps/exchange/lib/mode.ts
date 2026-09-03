import { env } from "@/lib/env";

export type DemoMode = "staged" | "live";

/**
 * Which backend drives the five beats.
 *
 * - `staged`: a local simulation of the 2-of-2 TSS-MPC flow. No network, no
 *   Dynamic client. Deterministic addresses per email. The mode for a stage.
 * - `live`: the Dynamic JS SDK (`@dynamic-labs-sdk/client`) against a sandbox
 *   environment on Ethereum Sepolia. Real social login, real MPC wallet,
 *   real USDC transfers, real key-share metadata on the architecture view.
 *
 * An explicit `NEXT_PUBLIC_EXCHANGE_MODE` wins; otherwise live iff an
 * environment id is configured.
 */
export const DEMO_MODE: DemoMode =
  env.NEXT_PUBLIC_EXCHANGE_MODE ??
  (env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ? "live" : "staged");
