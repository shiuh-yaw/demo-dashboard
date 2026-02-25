/**
 * Iron Finance Customer Virtual Accounts API Route
 *
 * GET /api/iron/customers/[id]/virtual-accounts - List virtual accounts for a customer
 * POST /api/iron/customers/[id]/virtual-accounts - Create a named virtual account
 *
 * Reference: https://docs.iron.xyz/account#named-virtual-account
 */

import { NextRequest } from "next/server";
import { createResponse, handleApiError } from "@/lib/api-response";
import { ironClient } from "@/lib/services/iron";

/**
 * GET /api/iron/customers/[id]/virtual-accounts
 * List all virtual accounts for a customer
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const virtualAccounts = await ironClient.listVirtualAccounts(id);
    return createResponse(virtualAccounts, 200);
  } catch (error) {
    return handleApiError(error, "iron/customers/virtual-accounts/list");
  }
}

/**
 * POST /api/iron/customers/[id]/virtual-accounts
 * Create a named virtual account for auto-ramp
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const result = await ironClient.createVirtualAccount(id, body);
    return createResponse(result, 201);
  } catch (error) {
    return handleApiError(error, "iron/customers/virtual-accounts/create");
  }
}
