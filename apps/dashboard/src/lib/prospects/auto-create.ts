/**
 * Auto-prospect creation: turns an inbound lead's email DOMAIN into a Prospect
 * so every identified contact has a company to sit under, instead of a growing
 * pile of "Direct" traffic attached to nothing.
 *
 * The row is deliberately unowned (`ownerId: null`, `teamId: null`,
 * `status: AUTO`). It is a queue item until an operator claims it - see
 * `unclaimedAutoWhere` / `canMutateProspect` in `lib/auth/gtm.ts` for the
 * visibility and claim rules that treat it that way.
 *
 * Guards, in order: consumer domains never create a company (nobody sells to
 * "Gmail"), an existing prospect on that domain is reused rather than
 * duplicated, and the name comes from enrichment when available so the row
 * reads "Fireblocks" rather than "fireblocks.com".
 */

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { isBusinessDomain } from "@/lib/enrichment/consumer-domains";
import type { EnrichmentProvider } from "@/lib/enrichment/types";
import { importProspectTheme } from "@/lib/prospects/theme-import";
import type {
  CreateProspectInput,
  Prospect,
  UpdateProspectInput,
} from "@/lib/services/types";

/** Palette every prospect row needs; `primaryColor` is not nullable. */
const DEFAULT_PRIMARY_COLOR = "#2563eb";

export interface AutoProspectServices {
  list(opts: {
    where: { domain: string };
    limit?: number;
  }): Promise<{ items: Prospect[] }>;
  create(input: CreateProspectInput): Promise<Prospect>;
  /** Used by the background branding import, after the row exists. */
  update(id: string, input: UpdateProspectInput): Promise<Prospect>;
}

export interface EnsureProspectOptions {
  prospects: AutoProspectServices;
  /** An already-resolved company name. Preferred over `provider` so a caller
   * that has enriched this domain already does not pay for a second lookup. */
  companyName?: string;
  /** Optional - supplies a real company name for the row. Without it the
   * domain is used, which is still better than no prospect at all. */
  provider?: EnrichmentProvider;
  logger?: { info(line: string): void; error(line: string, err?: unknown): void };
  /** Defers the branding import past the response. Defaults to Next `after()`,
   * which requires a request scope - injectable so this stays callable (and
   * testable) outside one. */
  schedule?: (fn: () => unknown) => void;
}

export type EnsureProspectOutcome =
  | { status: "matched"; prospect: Prospect }
  | { status: "created"; prospect: Prospect }
  /** Consumer domain, or nothing usable in the address. */
  | { status: "skipped" };

/** Title-cases a bare domain for display: "shipfinex.com" -> "Shipfinex". */
export function nameFromDomain(domain: string): string {
  const label = domain.split(".")[0] ?? domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Find-or-create the prospect for a business email domain.
 *
 * Not race-free: `Prospect.domain` carries no unique constraint (curated rows
 * may legitimately share one), so two simultaneous first-time leads on the
 * same domain can both create. Duplicates are visible in the AUTO queue and
 * mergeable there, which is preferable to a unique index that would also
 * constrain curated prospects.
 */
export async function ensureProspectForDomain(
  domain: string,
  opts: EnsureProspectOptions,
): Promise<EnsureProspectOutcome> {
  const normalized = domain.trim().toLowerCase();
  if (!normalized || !isBusinessDomain(normalized)) return { status: "skipped" };

  const existing = await opts.prospects.list({
    where: { domain: normalized },
    limit: 1,
  });
  const match = existing.items[0];
  if (match) return { status: "matched", prospect: match };

  let name = opts.companyName?.trim() || nameFromDomain(normalized);
  if (!opts.companyName && opts.provider) {
    try {
      const enriched = await opts.provider.enrich({ domain: normalized });
      if (enriched?.company?.name) name = enriched.company.name;
    } catch (err) {
      // A naming nicety, never a reason to skip creating the prospect.
      opts.logger?.error(
        `[auto-prospect] enrich failed, falling back to domain name`,
        err instanceof Error ? err.name : typeof err,
      );
    }
  }

  const prospect = await opts.prospects.create({
    ownerId: null,
    teamId: null,
    createdById: null,
    status: "AUTO",
    name,
    domain: normalized,
    companyUrl: `https://${normalized}`,
    primaryColor: DEFAULT_PRIMARY_COLOR,
  });
  // The domain is the company identity here, not personal data - no email or
  // local-part is ever logged.
  opts.logger?.info(`[auto-prospect] created id=${prospect.id}`);

  // Same background branding import an operator-created prospect gets -
  // without it every inbound company sat on the default blue. Post-response
  // so an inbound lead never waits on a model call; best-effort by contract.
  const schedule = opts.schedule ?? after;
  schedule(() =>
    importProspectTheme(prospect.id, `https://${normalized}`, {
      update: (id, input) => opts.prospects.update(id, input),
      revalidate: revalidatePath,
      logger: {
        error: (line, err) => opts.logger?.error(line, err),
      },
    }),
  );

  return { status: "created", prospect };
}
