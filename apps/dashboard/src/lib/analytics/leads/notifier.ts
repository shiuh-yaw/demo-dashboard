import { env } from "@/env";
import { services } from "@/lib/services";
import { getDemoBySlug } from "@/lib/landing/demos";
import type { Contact, ContactAppearance } from "@dynamic-demos/db";

const SLACK_POST_URL = "https://slack.com/api/chat.postMessage";

/** Block Kit body. Demo/Prospect lines are omitted when unknown (no placeholders). */
export function buildLeadBlocks(
  contact: Contact,
  demoName: string | null,
  prospectName: string | null,
): unknown[] {
  const lines = [
    "*New user tried our demo environment:*",
    `*Email:* <mailto:${contact.email}|${contact.email}>`,
    `*Date:* ${contact.firstSeenAt.toISOString()}`,
  ];
  if (demoName) lines.push(`*Demo:* ${demoName}`);
  if (prospectName) lines.push(`*Prospect:* ${prospectName}`);
  return [{ type: "section", text: { type: "mrkdwn", text: lines.join("\n") } }];
}

/** Post a first-seen lead to Slack #leads. No-op when unconfigured; never throws. */
export async function notifyNewContact(contact: Contact, appearance: ContactAppearance): Promise<void> {
  const token = env.SLACK_BOT_TOKEN;
  const channel = env.SLACK_LEADS_CHANNEL;
  if (!token || !channel) return; // unconfigured -> no-op

  try {
    const demoName = getDemoBySlug(appearance.demoSlug)?.name ?? null;
    let prospectName: string | null = null;
    if (appearance.prospectId) {
      const prospect = await services.prospects.get(appearance.prospectId);
      prospectName = prospect?.name ?? null;
    }
    await fetch(SLACK_POST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text: `New user tried our demo environment: ${contact.email}`,
        blocks: buildLeadBlocks(contact, demoName, prospectName),
      }),
    });
  } catch {
    // fail-silent - a Slack failure must never surface
  }
}
