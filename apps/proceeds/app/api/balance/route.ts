import { NextResponse } from "next/server";
import { ALCHEMY_NETWORKS } from "@dynamic-demos/alchemy";
import { getUsdcAddress } from "@/lib/network-config";
import { env } from "@/lib/env";
import { getServerUserData } from "@/lib/auth/server-auth";

export async function GET(request: Request) {
  const user = await getServerUserData();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const networkIdRaw = searchParams.get("networkId");

  if (!address || !networkIdRaw) {
    return NextResponse.json(
      { error: "address and networkId are required" },
      { status: 400 },
    );
  }

  const networkId = Number(networkIdRaw);
  const network = ALCHEMY_NETWORKS[networkId];
  if (!network) {
    return NextResponse.json(
      { error: `Unsupported network: ${networkId}` },
      { status: 400 },
    );
  }

  const usdcAddress = getUsdcAddress(networkId);
  if (!usdcAddress) {
    return NextResponse.json({ balance: 0 });
  }

  const url = `https://${network}.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getTokenBalances",
      params: [address, [usdcAddress]],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Alchemy request failed: ${res.status}` },
      { status: 502 },
    );
  }

  const json = (await res.json()) as {
    result?: {
      tokenBalances: { contractAddress: string; tokenBalance: string }[];
    };
    error?: { message: string };
  };

  if (json.error) {
    return NextResponse.json({ error: json.error.message }, { status: 502 });
  }

  const raw = json.result?.tokenBalances?.[0]?.tokenBalance ?? "0x0";
  // USDC has 6 decimals
  const balance = parseInt(raw, 16) / 1e6;

  return NextResponse.json({ balance, usdcAddress, networkId });
}
