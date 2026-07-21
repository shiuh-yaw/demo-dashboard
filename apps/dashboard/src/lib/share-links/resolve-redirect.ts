/**
 * `/s/[token]` redirect resolution (Phase GTM-05). Never a dead link (GTM
 * hard rule): an active token resolves to a branded + tracked launch URL; a
 * token that identifies a demo but is revoked/expired degrades to that
 * demo's plain launch URL (unbranded, untracked); a token that can't even
 * identify a demo redirects to `/`. Never throws.
 */

import { services } from "@/lib/services";
import type { DemoConfigService, ShareLinkService } from "@/lib/services";

import { buildBrandedLaunchUrl, buildPlainLaunchUrl } from "./launch-url";

export interface ResolveShareRedirectDeps {
  shareLinks: Pick<ShareLinkService, "resolveByToken" | "findByToken">;
  demoConfigs: Pick<DemoConfigService, "get">;
}

const defaultDeps: ResolveShareRedirectDeps = {
  shareLinks: services.shareLinks,
  demoConfigs: services.demoConfigs,
};

/**
 * Theme precedence (GTM-D-003): bound prospect > link prospect. A config
 * bound to a prospect (`demoConfig.prospectId != null`) always mints only
 * for that prospect (enforced at mint time), so passing the demoConfigId as
 * `?theme=` resolves the config's own bound prospect + its overrides. An
 * unbound config mints for any prospect, so the *link's* prospectId supplies
 * the theme directly.
 */
function themeIdFor(
  demoConfigProspectId: string | null,
  demoConfigId: string,
  linkProspectId: string,
): string {
  return demoConfigProspectId != null ? demoConfigId : linkProspectId;
}

/** Resolves the destination for `/s/[token]`. Returns "/" when the token can't identify a demo. */
export async function resolveShareRedirectUrl(
  token: string,
  deps: ResolveShareRedirectDeps = defaultDeps,
): Promise<string> {
  try {
    const active = await deps.shareLinks.resolveByToken(token);
    if (active) {
      const demoConfig = await deps.demoConfigs.get(active.demoConfigId);
      if (demoConfig) {
        const themeId = themeIdFor(
          demoConfig.prospectId,
          demoConfig.id,
          active.prospectId,
        );
        return buildBrandedLaunchUrl(demoConfig.kind, token, themeId);
      }
    }

    const raw = await deps.shareLinks.findByToken(token);
    if (raw) {
      const demoConfig = await deps.demoConfigs.get(raw.demoConfigId);
      if (demoConfig) return buildPlainLaunchUrl(demoConfig.kind);
    }
  } catch (err) {
    console.error("[share-links] resolveShareRedirectUrl failed:", err);
  }

  return "/";
}
