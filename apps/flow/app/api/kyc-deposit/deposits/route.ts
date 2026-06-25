/**
 * GET /api/kyc-deposit/deposits?customerId=<id>
 *
 * Lists deposit/offramp transactions for a customer by proxying
 * the dashboard's Iron autoramps endpoint.
 *
 * Dashboard route: GET /api/iron/customers/[id]/autoramps
 */

import { NextResponse, type NextRequest } from "next/server";
import { dashboardGet } from "@/lib/dashboard-api";
import { extractDashboardAuth } from "@/lib/dashboard-auth";

interface AutorampItem {
  id: string;
  kind: "Onramp" | "Offramp" | "Swap";
  status: string;
  created_at: string;
  is_third_party: boolean;
  deposit_rails?: Array<{
    iban?: string;
    name?: string;
    bic?: string;
    beneficiary_name?: string;
    address?: string;
    phone?: string;
  }>;
  destination_currency?: {
    blockchain?: string;
    token?: string;
    code?: string;
    type?: string;
  };
  source_currency?: {
    blockchain?: string;
    token?: string;
    code?: string;
    type?: string;
  };
  amount_in?: { amount: string; currency: { code: string; type: string } };
  amount_out?: { amount: string; currency: { code: string; type: string } };
  type?: string;
}

export async function GET(request: NextRequest) {
  const auth = extractDashboardAuth(request);

  // One fixed merchant receives all deposits — list the merchant's autoramps
  // (the dashboard resolves the merchant customer from env). No per-user id.
  const result = await dashboardGet<AutorampItem[]>(
    `/api/iron/sandbox/merchant-offramp`,
    auth,
  );

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error || "Failed to fetch deposits" },
      { status: 502 },
    );
  }

  return NextResponse.json({ deposits: result.data });
}
