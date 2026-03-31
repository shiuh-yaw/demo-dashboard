import { NextRequest, NextResponse } from "next/server";
import { handleTokenStats } from "./handler";

export async function GET(req: NextRequest) {
  try {
    const symbol = (
      req.nextUrl.searchParams.get("symbol") ?? "ETH"
    ).toUpperCase();
    const data = await handleTokenStats(symbol);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Token not found",
      },
      { status: 404 },
    );
  }
}
