import type { NextRequest } from "next/server";
import { z } from "zod";
import { cardEncryptedData } from "@dynamic-demos/rain";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getRainClient } from "@/lib/rain/client";
import { getRainCardFromRequest } from "@/lib/rain/card-from-request";

export const OPTIONS = corsOptions;

const cardDetailsSchema = z.object({ sessionId: z.string().min(1) });

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const card = getRainCardFromRequest(req);
    const { sessionId } = cardDetailsSchema.parse(await req.json());
    const encryptedData = await cardEncryptedData(
      getRainClient(),
      card.id,
      sessionId,
    );
    return createResponse({ encryptedData });
  } catch (error) {
    return handleApiError(error, "rain/card-details");
  }
});
