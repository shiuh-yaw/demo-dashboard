import type { NextRequest } from "next/server";
import { z } from "zod";
import { userWithdrawalSignature } from "@dynamic-demos/rain";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getRainClient } from "@/lib/rain/client";
import { getRainCardFromRequest } from "@/lib/rain/card-from-request";

export const OPTIONS = corsOptions;

const withdrawalSchema = z.object({
  chainId: z.number().int(),
  token: z.string().min(1),
  amount: z.string().min(1),
  adminAddress: z.string().min(1),
  recipientAddress: z.string().min(1),
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const card = getRainCardFromRequest(req);
    const data = withdrawalSchema.parse(await req.json());
    const signature = await userWithdrawalSignature(
      getRainClient(),
      card.userId,
      data,
    );
    return createResponse(signature);
  } catch (error) {
    return handleApiError(error, "rain/withdrawal");
  }
});
