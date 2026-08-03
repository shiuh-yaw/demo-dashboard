/**
 * Synthetic seed for ephemeral preview branch databases.
 *
 * SAFETY: this must never run against production. `.env.local` points at the
 * prod database, so we refuse unless VERCEL_ENV is "preview" (the per-PR
 * Supabase branch) or ALLOW_SEED=true is set explicitly for local dev against
 * a throwaway DB. The build wires it to run only on Vercel preview.
 *
 * Data is entirely synthetic - no real prospects, contacts, or PII. Idempotent
 * via fixed ids + upserts, so re-running on the same branch is a no-op.
 */

import { prisma } from "../src/client";

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

async function main() {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.ALLOW_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to seed outside a Vercel preview branch. Set ALLOW_SEED=true " +
        "only when DATABASE_URL points at a throwaway database (never prod).",
    );
  }

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

  console.log(
    `Seeded ${PROSPECTS.length} prospects, ${PROSPECTS.length * KINDS.length} demo configs + sessions.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
