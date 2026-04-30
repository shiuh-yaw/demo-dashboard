import { NextResponse } from "next/server";
import { fetchTransactionHistoryPage } from "@/lib/transactions/server";
import { getServerUserData } from "@/lib/auth/server-auth";

const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const user = await getServerUserData();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const networkIdRaw = searchParams.get("networkId");
  const limitRaw = searchParams.get("limit");
  const pageKey = searchParams.get("pageKey");

  if (!address || !networkIdRaw) {
    return NextResponse.json(
      { error: "address and networkId are required" },
      { status: 400 },
    );
  }

  const networkId = Number(networkIdRaw);
  if (!Number.isFinite(networkId)) {
    return NextResponse.json(
      { error: `Invalid networkId: ${networkIdRaw}` },
      { status: 400 },
    );
  }

  const limit = limitRaw
    ? Math.max(1, Math.min(MAX_LIMIT, Number(limitRaw) || 25))
    : 25;

  try {
    const page = await fetchTransactionHistoryPage({
      address,
      networkId,
      limit,
      pageKey,
    });
    return NextResponse.json(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.startsWith("Unsupported network") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
