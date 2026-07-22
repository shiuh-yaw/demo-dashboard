/**
 * `/api/share/context` response resolution (Phase GTM-05). Public - never
 * throws, never leaks more than `prospectName` + a book-a-call `cta`
 * (never emails, ids, theme internals, or SE identity beyond the CTA
 * label). Invalid/inactive tokens resolve to `{}`.
 */

import { services } from "@/lib/services";
import type { ShareLinkService } from "@/lib/services";

export interface ShareContextDeps {
  shareLinks: Pick<ShareLinkService, "resolveByToken">;
}

const defaultDeps: ShareContextDeps = {
  shareLinks: services.shareLinks,
};

export interface ShareContextCta {
  label: string;
  url: string;
}

/** Org-wide book-a-call fallback when the minting SE has no scheduling URL. */
const DEFAULT_CTA: ShareContextCta = {
  label: "Book a call",
  url: "https://www.dynamic.xyz/book-a-call",
};

export interface ShareContextResponse {
  prospectName?: string;
  cta?: ShareContextCta | null;
}

/** `cta.url` must be https - validated at profile save (Phase 03); re-assert here before returning. */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function resolveShareContext(
  token: string,
  deps: ShareContextDeps = defaultDeps,
): Promise<ShareContextResponse> {
  try {
    const link = await deps.shareLinks.resolveByToken(token);
    if (!link) return {};

    const schedulingUrl = link.user.schedulingUrl;
    const cta: ShareContextCta =
      schedulingUrl && isHttpsUrl(schedulingUrl)
        ? {
            label: link.user.displayName
              ? `Book a call with ${link.user.displayName}`
              : "Book a call",
            url: schedulingUrl,
          }
        : DEFAULT_CTA;

    return { prospectName: link.prospect.name, cta };
  } catch (err) {
    console.error("[share-links] resolveShareContext failed:", err);
    return {};
  }
}
