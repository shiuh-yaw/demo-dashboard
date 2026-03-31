import { NextRequest, NextResponse } from "next/server";
import { handleMarketCoins } from "./handler";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const perPage = searchParams.get("per_page");
    const order = searchParams.get("order") ?? undefined;

    const data = await handleMarketCoins({
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
      order,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch market data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
