/**
 * Synthetic seed for ephemeral preview branch databases.
 *
 * SAFETY: this must never run against production. `.env.local` points at the
 * prod database, so `assertSeedTargetAllowed` refuses unless the CONNECTION
 * itself is provably disposable - see `src/seed-guard.ts`. The build wires it
 * to run only on Vercel preview.
 *
 * Data is synthetic - invented people, no PII. One real company DOMAIN
 * (fireblocks.com, the operator's own) is seeded so enrichment has something
 * resolvable to work on. Idempotent via fixed ids + upserts, so re-running on
 * the same branch is a no-op.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../src/client";
import { assertSeedTargetAllowed } from "../src/seed-guard";

// Real admin so logging into a preview with this email (matched by
// getOrCreateByEmail) owns the seeded prospects. Keyed on email so the seed
// matches an existing row - whether a prior seed or a row a real login
// already created on this branch - instead of colliding on the unique email.
const OWNER_EMAIL = "etesenair@fireblocks.com";

const PROSPECTS = [
  {
    id: "seed-prospect-acme",
    name: "Acme Corp",
    domain: "acme.example",
    primaryColor: "#4779FF",
  },
  {
    id: "seed-prospect-northwind",
    name: "Northwind",
    domain: "northwind.example",
    primaryColor: "#E4572E",
  },
] as const;

const KINDS = ["wallet", "trade", "flow", "card"] as const;

/**
 * Viewers who identified themselves. Without these the Contacts page is empty:
 * it hides unidentified viewers by default, and every downstream feature
 * (company enrichment, auto-prospects, the claim queue) keys off a captured
 * business email.
 *
 * Addresses are invented. Domains are RFC 2606 `.example` ones - which cannot
 * resolve to a real company - EXCEPT `fireblocks.com`, included deliberately so
 * the enrichment path has a domain the model can actually recognise. See that
 * entry's comment.
 */
interface SeedViewer {
  key: string;
  email: string;
  demoSlug: string;
  /** Attached to a share link (and so to a prospect) vs. arrived direct. */
  attributed: boolean;
  enrichment: Prisma.InputJsonValue | null;
}

/**
 * Real, widely-known company domains, one seeded viewer each. Real because the
 * point is to exercise enrichment end to end: a `.example` domain is
 * RFC-reserved, so the model cannot recognise one and every Enrich would
 * report "no confident match". Local-parts are invented - these are seeded
 * companies, not seeded people.
 *
 * All arrive direct and unenriched, so each one is a full test: Enrich
 * resolves the company AND creates the prospect it belongs to.
 */
const ENRICHABLE_COMPANIES: ReadonlyArray<readonly [string, string]> = [
  ["fireblocks.com", "wallet"],
  ["stripe.com", "card"],
  ["coinbase.com", "trade"],
  ["shopify.com", "card"],
  ["databricks.com", "flow"],
  ["figma.com", "wallet"],
  ["vercel.com", "flow"],
  ["ramp.com", "card"],
  ["chainalysis.com", "trade"],
];

const IDENTIFIED_VIEWERS: SeedViewer[] = [
  {
    key: "matched",
    email: "dana@northwind.example",
    // Matches a seeded prospect's domain, so the backfill reports "matched"
    // rather than creating a duplicate.
    demoSlug: "wallet",
    attributed: true,
    enrichment: {
      company: {
        name: "Northwind",
        domain: "northwind.example",
        industry: "Logistics",
        sizeBand: "201-500",
        summary: "Freight forwarding and customs brokerage.",
      },
      provider: "seed",
      confidence: "high",
      enrichedAt: "2026-08-13T09:00:00.000Z",
    },
  },
  {
    key: "unenriched",
    email: "sam@globex.example",
    // No prospect and no enrichment: the row both the Enrich control and the
    // prospect backfill have work to do on. Unattributed on purpose - hanging
    // it off a share link would give it Northwind and defeat the point.
    demoSlug: "trade",
    attributed: false,
    enrichment: null,
  },
  {
    key: "direct",
    email: "rilee@initech.example",
    // No share link - the "Direct" case that used to be invisible entirely.
    demoSlug: "flow",
    attributed: false,
    enrichment: null,
  },
  {
    key: "consumer",
    email: "casual.viewer@gmail.com",
    // Consumer domain: must never produce a company or a prospect.
    demoSlug: "card",
    attributed: false,
    enrichment: null,
  },
  ...ENRICHABLE_COMPANIES.map(([domain, demoSlug]) => ({
    key: `enrich-${domain.split(".")[0]}`,
    email: `demo.viewer@${domain}`,
    demoSlug,
    attributed: false,
    enrichment: null,
  })),
];

/** Anonymous direct traffic - hidden by default, revealed by the toggle. */
const ANON_DIRECT_SESSIONS = 3;

async function main() {
  const target = assertSeedTargetAllowed(process.env);
  console.log(`Seeding database ${target}.`);

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { displayName: "Eric Tesenair", role: "ADMIN" },
    create: {
      email: OWNER_EMAIL,
      displayName: "Eric Tesenair",
      role: "ADMIN",
    },
  });

  for (const p of PROSPECTS) {
    const prospect = await prisma.prospect.upsert({
      where: { id: p.id },
      update: { ownerId: owner.id, createdById: owner.id },
      create: {
        id: p.id,
        ownerId: owner.id,
        createdById: owner.id,
        name: p.name,
        domain: p.domain,
        companyUrl: `https://${p.domain}`,
        primaryColor: p.primaryColor,
        logo: "dynamic",
      },
    });

    for (const kind of KINDS) {
      const demoId = `seed-demo-${p.id}-${kind}`;
      const demo = await prisma.demoConfig.upsert({
        where: { id: demoId },
        update: { ownerId: owner.id, createdById: owner.id },
        create: {
          id: demoId,
          kind,
          ownerId: owner.id,
          createdById: owner.id,
          prospectId: prospect.id,
          name: `${p.name} - ${kind}`,
          isPrimary: true,
          config: {
            branding: { appName: p.name },
            theme: { primaryColor: p.primaryColor },
          },
        },
      });

      const linkId = `seed-link-${demo.id}`;
      const shareLink = await prisma.shareLink.upsert({
        where: { id: linkId },
        update: { userId: owner.id },
        create: {
          id: linkId,
          token: `seed-${demo.id}`,
          demoConfigId: demo.id,
          prospectId: prospect.id,
          userId: owner.id,
          status: "active",
        },
      });

      // A couple of sessions + events so the analytics/contacts views render.
      for (let i = 0; i < 2; i++) {
        const sessionId = `seed-session-${demo.id}-${i}`;
        await prisma.visitorSession.upsert({
          where: { id: sessionId },
          update: {},
          create: {
            id: sessionId,
            shareLinkId: shareLink.id,
            demoSlug: kind,
            anonId: `seed-anon-${demo.id}-${i}`,
            isInternal: false,
          },
        });
        await prisma.trackEvent.upsert({
          where: { id: `seed-event-${sessionId}` },
          update: {},
          create: {
            id: `seed-event-${sessionId}`,
            sessionId,
            ts: new Date(),
            type: "pageview",
            name: "pageview",
            path: "/",
          },
        });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Identified viewers. The block above produces pageview-only sessions, so
  // on its own every contact reads "Unknown User" and the Contacts page -
  // which hides those by default - renders empty.
  // ---------------------------------------------------------------------
  const northwindLink = await prisma.shareLink.findUnique({
    where: { id: "seed-link-seed-demo-seed-prospect-northwind-wallet" },
  });

  for (const viewer of IDENTIFIED_VIEWERS) {
    const sessionId = `seed-session-identified-${viewer.key}`;
    const anonId = `seed-anon-identified-${viewer.key}`;

    await prisma.visitorSession.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        // Attributed sessions hang off a real share link; direct ones have
        // none, which is exactly what makes them "Direct" in the UI.
        shareLinkId: viewer.attributed ? (northwindLink?.id ?? null) : null,
        demoSlug: viewer.demoSlug,
        anonId,
        isInternal: false,
        identifiedEmail: viewer.email,
        identifiedUserId: `seed-dyn-${viewer.key}`,
        enrichment: viewer.enrichment ?? undefined,
      },
    });

    // The `authenticated` milestone is what the contacts read groups on -
    // identifiedEmail alone does not name a contact.
    await prisma.trackEvent.upsert({
      where: { id: `seed-event-auth-${viewer.key}` },
      update: {},
      create: {
        id: `seed-event-auth-${viewer.key}`,
        sessionId,
        ts: new Date(),
        type: "milestone",
        name: "authenticated",
        path: "/",
        props: { email: viewer.email, dynamicUserId: `seed-dyn-${viewer.key}` },
      },
    });

    // Contact rows are the prospect backfill's input - it sweeps captured
    // emails, not sessions.
    const contact = await prisma.contact.upsert({
      where: { email: viewer.email },
      update: {},
      create: {
        email: viewer.email,
        dynamicUserId: `seed-dyn-${viewer.key}`,
        sightingCount: 1,
        notifiedAt: new Date(),
      },
    });
    const appearance = await prisma.contactAppearance.findFirst({
      where: { contactId: contact.id, demoSlug: viewer.demoSlug },
    });
    if (!appearance) {
      await prisma.contactAppearance.create({
        data: { contactId: contact.id, demoSlug: viewer.demoSlug, prospectId: null },
      });
    }
  }

  // Anonymous direct traffic: hidden behind the Contacts toggle by default.
  for (let i = 0; i < ANON_DIRECT_SESSIONS; i++) {
    const sessionId = `seed-session-anon-direct-${i}`;
    await prisma.visitorSession.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        shareLinkId: null,
        demoSlug: "wallet",
        anonId: `seed-anon-direct-${i}`,
        isInternal: false,
      },
    });
    await prisma.trackEvent.upsert({
      where: { id: `seed-event-anon-direct-${i}` },
      update: {},
      create: {
        id: `seed-event-anon-direct-${i}`,
        sessionId,
        ts: new Date(),
        type: "pageview",
        name: "pageview",
        path: "/",
      },
    });
  }

  // An unclaimed AUTO prospect, so the Prospects "Unclaimed" queue and its
  // Claim button are populated without having to run the backfill first.
  // Unowned by design: ownerId and createdById both null.
  await prisma.prospect.upsert({
    where: { id: "seed-prospect-auto-initech" },
    update: {},
    create: {
      id: "seed-prospect-auto-initech",
      ownerId: null,
      createdById: null,
      teamId: null,
      status: "AUTO",
      name: "Initech",
      domain: "initech.example",
      companyUrl: "https://initech.example",
      primaryColor: "#7C3AED",
      logo: "dynamic",
    },
  });

  console.log(
    `Seeded ${PROSPECTS.length} prospects (+1 unclaimed AUTO), ` +
      `${PROSPECTS.length * KINDS.length} demo configs, ` +
      `${IDENTIFIED_VIEWERS.length} identified viewers, ` +
      `${ANON_DIRECT_SESSIONS} anonymous direct sessions.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
