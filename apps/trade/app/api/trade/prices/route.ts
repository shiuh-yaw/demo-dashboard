import { NextResponse } from "next/server";
import { handleTokenPrices } from "./handler";

export async function GET() {
  try {
    const data = await handleTokenPrices();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch prices",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
