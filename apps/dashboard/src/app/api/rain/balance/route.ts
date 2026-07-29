import type { NextRequest } from "next/server";
import { userCreditBalance } from "@dynamic-demos/rain";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getRainClient } from "@/lib/rain/client";
import { getRainCardFromRequest } from "@/lib/rain/card-from-request";

export const OPTIONS = corsOptions;

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const card = getRainCardFromRequest(req);
    const balance = await userCreditBalance(getRainClient(), card.userId);
    return createResponse(balance);
  } catch (error) {
    return handleApiError(error, "rain/balance");
  }
});
