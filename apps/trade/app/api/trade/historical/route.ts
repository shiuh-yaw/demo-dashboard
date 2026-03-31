import { NextRequest, NextResponse } from "next/server";
import { handleHistoricalPrices, HistoricalPricesSchema } from "./handler";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = HistoricalPricesSchema.safeParse(raw);

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join("; ");
      return NextResponse.json(
        { error: "Invalid request", details: message },
        { status: 400 },
      );
    }

    const data = await handleHistoricalPrices(parsed.data);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to fetch historical prices",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
