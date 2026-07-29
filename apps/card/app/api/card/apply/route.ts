import { NextResponse } from "next/server";

import { applicationSchema } from "@/components/application/schema";

/**
 * The one app-owned server route. Forwards the application to the dashboard
 * `/api/rain/apply` (which holds RAIN_API_KEY and creates the Rain
 * application + card) and returns the created card. Persistence is the
 * client's job (`useRainCardStore().save`, client-side Dynamic metadata) - no
 * admin token here, and the dashboard never resolves the card.
 *
 * Typed as the standard `Request` (not `NextRequest`) - only
 * `headers.get`/`json()` are used, both on the base `Request` interface, so
 * this stays testable with a plain `new Request(...)` while Next.js's real
 * `NextRequest` (which extends `Request`) still satisfies the parameter.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let parsed;
  try {
    parsed = applicationSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  }

  const auth = req.headers.get("authorization");
  const envId = req.headers.get("x-dynamic-environment-id");

  const base =
    process.env.DASHBOARD_URL ??
    process.env.NEXT_PUBLIC_DASHBOARD_URL ??
    "";
  const forwarded = await fetch(`${base}/api/rain/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
      ...(envId ? { "x-dynamic-environment-id": envId } : {}),
    },
    body: JSON.stringify(parsed),
  });

  const payload = await forwarded.json().catch(() => ({}));
  if (!forwarded.ok) {
    return NextResponse.json(
      { error: payload?.error ?? "Application failed" },
      { status: forwarded.status },
    );
  }

  const card = payload?.data?.card ?? payload?.card;

  // Storage is the client's job: the caller persists this card to Dynamic
  // metadata via `useRainCardStore().save` (client-side, no admin token). This
  // route only forwards the application and returns the created card.
  return NextResponse.json({ card });
}
