import { Client } from "@upstash/qstash";
import { env } from "@/lib/env";

let client: Client | null = null;

function isConfigured(): boolean {
  return Boolean(env.QSTASH_TOKEN);
}

function getClient(): Client {
  if (!client) client = new Client({ token: env.QSTASH_TOKEN! });
  return client;
}

// Fire-and-forget. The caller has already transitioned the order to
// tx_confirmed and stored proof of payment. We NEVER throw:
// - In prod (QStash configured), a publish failure means reconcile cron
//   picks the order up later. The user-facing flow does not fail.
// - In dev (QStash unconfigured), the async Cvent postback path is inert.
//   We log a warning and return. The admin UI provides manual retry.
export async function enqueueCventPostback(
  appBaseUrl: string,
  confirmation: string
): Promise<void> {
  if (!isConfigured()) {
    // Bare local dev: no QStash configured, so the async Cvent postback path
    // is inert. Order stays at tx_confirmed (UI still renders Confirmed).
    // Use /admin to trigger the postback manually for local Cvent
    // verification, or set up ngrok + QStash for full E2E.
    console.warn(
      `[spark26] QStash unconfigured — Cvent postback not enqueued for ${confirmation}. Use /admin to retry manually.`,
    );
    return;
  }
  console.info(
    `[spark26] enqueuing Cvent postback via QStash for ${confirmation}`,
  );
  try {
    await getClient().publishJSON({
      url: `${appBaseUrl}/api/internal/worker`,
      body: { confirmation },
      retries: 5,
    });
  } catch (err) {
    console.warn(
      `[spark26] QStash enqueue failed for ${confirmation}; reconcile cron will retry`,
      err,
    );
  }
}
