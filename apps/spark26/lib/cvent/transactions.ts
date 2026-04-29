import { env } from "@/lib/env";
import { isFixtureAttendee } from "./fixtures.js";

// We bypass @cvent/sdk for POST /events/{id}/transactions. The SDK's
// `CreateTransactionResponseInput` Zod schema silently strips the `orders`
// field before sending, but Cvent's API requires it — without it the request
// is rejected with 400 "Incomplete request body". Proven in Postman: a body
// including `event`, `attendee`, `orders: [{id}]`, plus payment fields returns
// 201 with Cvent computing `amount` from the order's outstanding balance.
// If/when the Speakeasy-generated input schema is fixed, this file can revert
// to `sdk.events.postTransactions(...)`.

// Pin the token cache on globalThis so Next.js HMR doesn't wipe it on every
// code change during dev — same reason as the SDK singleton in client.ts.
// Prod doesn't need this (no HMR) but it's harmless there.
declare global {
  var __spark26CventToken: { value: string; expiresAt: number } | undefined;
}

async function getToken(): Promise<string> {
  const cached = globalThis.__spark26CventToken;
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.value;
  }
  const creds = Buffer.from(
    `${env.CVENT_CLIENT_ID}:${env.CVENT_CLIENT_SECRET}`,
  ).toString("base64");
  const tokenURL = new URL("/ea/oauth2/token", env.CVENT_BASE_URL).toString();
  const res = await fetch(tokenURL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "event/transactions:write",
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(
      `[spark26][cvent][tx] token mint FAILED status=${res.status} body=${body.slice(0, 200)}`,
    );
    throw new Error(`Cvent token mint failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  globalThis.__spark26CventToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

export async function postOfflineCharge(args: {
  attendeeId: string;
  orderId: string;
  paidAt: Date;
  reference: string;
}) {
  if (isFixtureAttendee(args.attendeeId)) {
    return { id: `banana-tx-${Date.now()}`, success: true };
  }

  const token = await getToken();
  const url = new URL(
    `/ea/events/${encodeURIComponent(env.CVENT_EVENT_ID)}/transactions?partialPayment=false`,
    env.CVENT_BASE_URL,
  ).toString();
  const body = {
    event: { id: env.CVENT_EVENT_ID },
    attendee: { id: args.attendeeId },
    orders: [{ id: args.orderId }],
    paymentType: "Offline Charge",
    paymentMethod: "Other",
    date: args.paidAt.toISOString(),
    referenceNumber: args.reference,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Cvent postTransactions ${res.status}: ${text}`);
  }
  return JSON.parse(text) as { id?: string; success?: boolean };
}
