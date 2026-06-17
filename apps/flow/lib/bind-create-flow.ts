import type { CreateFlowInput } from "@/lib/checkouts-api";
import { createFlow } from "@/lib/checkouts-api";

export type FlowCreateConfig = Omit<
  CreateFlowInput,
  "amount" | "currency"
>;

/** Bind static flow config into a PaymentWidget `createFlow` callback. */
export function bindCreateFlow(
  config: FlowCreateConfig,
): (params: { amount: string; currency: string }) => Promise<string> {
  return ({ amount, currency }) =>
    createFlow({
      ...config,
      amount,
      currency,
    });
}
