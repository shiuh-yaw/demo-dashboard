import { z } from "zod";
import { PAYOUT_SIMULATION_MAX_USDC } from "@/lib/constants";

/**
 * Request body for `POST /api/payout`.
 *
 * Lives in its own module so the schema can be unit-tested without
 * pulling in the full Next.js route runtime.
 */
export const payoutBodySchema = z.object({
  amountUsdc: z
    .number()
    .positive()
    .max(PAYOUT_SIMULATION_MAX_USDC, {
      message: `Amount exceeds demo limit of ${PAYOUT_SIMULATION_MAX_USDC} USDC per payout`,
    }),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
  monthKey: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "monthKey must be in YYYY-MM format"),
  chainId: z.number().int().positive(),
});

export type PayoutBody = z.infer<typeof payoutBodySchema>;
