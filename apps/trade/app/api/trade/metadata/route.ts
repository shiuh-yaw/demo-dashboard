import { NextRequest, NextResponse } from "next/server";
import { handleTokenMetadata } from "./handler";

export async function GET(req: NextRequest) {
  try {
    const symbol = (
      req.nextUrl.searchParams.get("symbol") ?? "ETH"
    ).toUpperCase();
    const data = await handleTokenMetadata(symbol);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch metadata",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
