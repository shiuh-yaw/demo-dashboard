import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, getUserIdFromPayload } from "@dynamic-demos/dynamic";
import { env } from "@/lib/env";
import { parseJsonBody } from "@/lib/api/parse-body";

import { signAsDelegate } from "@/lib/delegation/sign";
import { getDelegationByAddress, touchDelegation } from "@/lib/delegation/store";

const signSchema = z.object({
  // Address, not walletId: the browser's `walletAccount.id` is the SDK's
  // identifier, not Dynamic's, and the two are not interchangeable.
  address: z.string().min(1),
  message: z.string().min(1).max(500),
});

/**
 * POST /api/delegation/sign
 *
 * Sign a message as the user, using the delegated share. The browser holds no
 * part of this signature - that is the whole point of the demo.
 */
export async function POST(request: NextRequest) {
  const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  const user = await getAuthenticatedUser(request, environmentId);
  const userId = getUserIdFromPayload(user);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fail closed, and name the missing knob - an operator reading logs should
  // not have to guess which one.
  const apiKey = env.DYNAMIC_API_TOKEN ?? env.DYNAMIC_API_KEY;
  const encryptionKey = env.DELEGATION_ENC_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Delegated signing is not configured (DYNAMIC_API_TOKEN)" },
      { status: 503 },
    );
  }
  if (!encryptionKey) {
    return NextResponse.json(
      { error: "Delegated signing is not configured (DELEGATION_ENC_KEY)" },
      { status: 503 },
    );
  }

  const parsed = await parseJsonBody(request, signSchema, "delegation/sign");
  if (parsed.error) return parsed.error;
  const { address, message } = parsed.data;

  const delegation = await getDelegationByAddress(userId, address);
  // Absent means the webhook has not landed yet (or was revoked). The client
  // treats 409 as "waiting for setup", not a hard failure.
  if (!delegation) {
    return NextResponse.json(
      { error: "No delegated access stored for this wallet yet" },
      { status: 409 },
    );
  }

  try {
    const result = await signAsDelegate({
      delegation,
      message,
      environmentId,
      apiKey,
      encryptionKey,
    });
    await touchDelegation(userId, delegation.walletId);
    // Name where this ran. The whole claim of the demo is that the browser did
    // not produce this signature, and a region it cannot invent is the
    // difference between showing that and asserting it.
    return NextResponse.json({
      ...result,
      server: env.VERCEL_REGION ?? "localhost",
    });
  } catch (error) {
    console.error(
      "[delegation/sign] ceremony failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { error: "Could not sign with the delegated share" },
      { status: 502 },
    );
  }
}
