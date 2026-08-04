import { prisma as defaultPrisma, type PrismaClient } from "@dynamic-demos/db";
import type { ContactService, RecordSightingInput, RecordSightingResult } from "../types";

/**
 * Durable contact capture. `recordSighting` upserts the global Contact
 * (first-seen wins), atomically claims the one-time notification, and
 * upserts the (demo, prospect) appearance. Postgres-only.
 */
export class PostgresContactService implements ContactService {
  private readonly client: PrismaClient;
  constructor(client: PrismaClient = defaultPrisma) {
    this.client = client;
  }

  async recordSighting(input: RecordSightingInput): Promise<RecordSightingResult> {
    const email = input.email;
    const contact = await this.client.contact.upsert({
      where: { email },
      create: { email, dynamicUserId: input.dynamicUserId ?? null, sightingCount: 1 },
      // first-seen fields (email, firstSeenAt, dynamicUserId) never overwritten;
      // only activity fields bump on repeat sightings.
      update: { lastSeenAt: new Date(), sightingCount: { increment: 1 } },
    });

    // Race-safe claim: only the caller that flips null -> now returns count 1.
    // Deliberately BEFORE the appearance write: ingest-safety and "never
    // double-post" win over guaranteed delivery. If the appearance write below
    // throws, the notification for this first sighting is lost (notifiedAt is
    // already set, so no later sighting re-claims) - an accepted best-effort
    // tradeoff. Do not reorder this after the appearance write without moving
    // both into one transaction.
    const claim = await this.client.contact.updateMany({
      where: { email, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    const shouldNotify = claim.count === 1;

    const prospectId = input.prospectId ?? null;
    let appearance = await this.client.contactAppearance.findFirst({
      where: { contactId: contact.id, demoSlug: input.demoSlug, prospectId },
    });
    if (!appearance) {
      appearance = await this.client.contactAppearance.create({
        data: { contactId: contact.id, demoSlug: input.demoSlug, prospectId },
      });
    }

    return { contact, shouldNotify, appearance };
  }
}
