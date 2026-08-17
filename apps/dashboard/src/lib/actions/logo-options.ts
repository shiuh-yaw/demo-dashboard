"use server";

/**
 * Every logo we can find for a company website, for the operator to choose
 * from.
 *
 * The automatic pick cannot always win: wellsfargo.com's real wordmark is
 * white ink, correct on their red chrome and invisible on a light surface, and
 * no filename heuristic or model judgement reliably catches that. Showing the
 * candidates turns an unwinnable guess into one click. The background import
 * still picks automatically - an auto-created inbound prospect has nobody to
 * ask.
 */

import { getSessionUser } from "@/lib/auth/gtm";
import {
  BROWSER_HEADERS,
  fetchManifestBrand,
  logoCandidatesFromHtml,
  resolveLogoCandidates,
} from "@/lib/branding/brand-sources";

export interface LogoOptionsResult {
  /** Reachable logo URLs, best first. Empty when nothing resolved. */
  options: string[];
  error?: string;
}

export async function findLogoOptions(
  website: string,
): Promise<LogoOptionsResult> {
  // Server-side fetch of a caller-supplied URL - session required (SSRF guard).
  const user = await getSessionUser();
  if (!user) return { options: [], error: "Authentication required" };

  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const baseUrl = new URL(url);
    const hostname = baseUrl.hostname.replace(/^www\./, "");

    const response = await fetch(url, { headers: BROWSER_HEADERS });
    // Bot protection is common and not fatal: the manifest and the icon
    // services are keyed on the domain, not the markup.
    const html = response.ok ? await response.text() : "";
    const manifest = await fetchManifestBrand(html, baseUrl.origin);

    const options = await resolveLogoCandidates(
      hostname,
      logoCandidatesFromHtml(html),
      baseUrl.origin,
      manifest.icons,
    );

    return { options };
  } catch (err) {
    console.error("[logo-options] lookup failed", err);
    return {
      options: [],
      error: err instanceof Error ? err.message : "Could not find logos",
    };
  }
}
