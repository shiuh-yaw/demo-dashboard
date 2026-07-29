import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  createUserDepositContract,
  userDepositContract,
} from "@dynamic-demos/rain";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { getRainClient } from "@/lib/rain/client";
import { getRainCardFromRequest } from "@/lib/rain/card-from-request";

export const OPTIONS = corsOptions;

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const card = getRainCardFromRequest(req);
    const contracts = await userDepositContract(getRainClient(), card.userId);
    return createResponse(contracts);
  } catch (error) {
    return handleApiError(error, "rain/contracts");
  }
});

const createContractSchema = z.object({ chainId: z.number().int() });

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const card = getRainCardFromRequest(req);
    const { chainId } = createContractSchema.parse(await req.json());
    const contract = await createUserDepositContract(
      getRainClient(),
      card.userId,
      chainId,
    );
    return createResponse(contract);
  } catch (error) {
    return handleApiError(error, "rain/contracts");
  }
});
