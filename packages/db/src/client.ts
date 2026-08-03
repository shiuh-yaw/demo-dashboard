/**
 * Serverless-safe Prisma client singleton.
 *
 * Why a singleton:
 *   In serverless / Next.js dev (with hot reload), each module reload would
 *   otherwise instantiate a new PrismaClient, exhausting the database
 *   connection pool. We cache the instance on `globalThis` for non-production
 *   environments. In production, each cold start gets exactly one instance
 *   per worker and no caching is needed.
 *
 * D-013: DATABASE_URL points at the Supabase pooler (port 6543) for runtime.
 *        DIRECT_URL is reserved for migrations and never touched here.
 *
 * D-015: Consumed only by apps/dashboard. Demo apps must fetch via the
 *        dashboard API; importing this client from any other app is a bug.
 *
 * Preview branch DBs: on a Vercel preview the Supabase branch integration
 * injects POSTGRES_PRISMA_URL (pooled) but not DATABASE_URL, so fall back to
 * it. Production/local keep their own DATABASE_URL and never hit the fallback.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL;

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
