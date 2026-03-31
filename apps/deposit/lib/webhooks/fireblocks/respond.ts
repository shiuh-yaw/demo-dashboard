import { NextResponse } from "next/server";

export function webhookAck(logMessage?: string) {
  if (logMessage) console.log(`[webhook/fireblocks] ${logMessage}`);
  return NextResponse.json({ received: true });
}

export function webhookInvalidSignature() {
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}

export function webhookProcessingError() {
  return NextResponse.json(
    { error: "Webhook processing failed" },
    { status: 500 },
  );
}
