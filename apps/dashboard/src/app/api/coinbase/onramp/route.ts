import { type NextRequest } from "next/server";
import {
  CoinbaseError,
  createCoinbaseOnrampClient,
  createOnrampOrder,
  createOnrampOrderApiSchema,
} from "@dynamic-demos/coinbase-onramp";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import {
  createResponse,
  handleApiError,
  createErrorResponse,
} from "@/lib/api-response";
import { parseWithSchema } from "@/lib/validation";

export const OPTIONS = corsOptions;

// Sandbox-by-default per DECISIONS.md D-005. The dashboard route forwards
// the per-request `isSandbox` flag to Coinbase via the package payload;
// the client itself defaults to sandbox unless promoted to production by
// an explicit env override later (Phase 5B orchestration).
const coinbaseOnrampClient = createCoinbaseOnrampClient({ env: "sandbox" });

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const validatedBody = parseWithSchema(createOnrampOrderApiSchema, body);

    // TODO: Get phone number from verified credentials
    const phoneNumber = "+12345678901";
    const phoneNumberVerifiedAt = new Date().toISOString();

    // Make the authenticated request to Coinbase API
    const result = await createOnrampOrder(coinbaseOnrampClient, {
      ...validatedBody,
      partnerUserRef: validatedBody.isSandbox
        ? `sandbox-${user.sub}`
        : user.sub,
      email: user.email ?? "",
      phoneNumber,
      phoneNumberVerifiedAt,
    });

    return createResponse(result);
  } catch (error) {
    // Handle Coinbase-specific errors with custom status code
    if (error instanceof CoinbaseError) {
      return createErrorResponse(
        error.message,
        error.statusCode,
        error.originalError?.message || "Coinbase API error"
      );
    }

    // Handle generic errors
    return handleApiError(error, "coinbase/onramp");
  }
});
