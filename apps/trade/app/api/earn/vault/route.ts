import { NextResponse } from "next/server";
import { getVaultByAddress } from "@/lib/api/vaults";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const chainIdParam = searchParams.get("chainId");

  if (!address?.startsWith("0x") || !chainIdParam) {
    return NextResponse.json(
      { error: "address and chainId required" },
      { status: 400 },
    );
  }

  const chainId = parseInt(chainIdParam, 10);
  if (Number.isNaN(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }

  try {
    const vault = await getVaultByAddress(address, chainId);
    if (!vault) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 });
    }
    return NextResponse.json(vault);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch vault" },
      { status: 500 },
    );
  }
}
