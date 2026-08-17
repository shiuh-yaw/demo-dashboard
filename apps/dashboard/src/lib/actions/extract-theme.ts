"use server";

import Anthropic from "@anthropic-ai/sdk";
import type { WidgetTheme, WidgetBranding } from "@/lib/widget-config";
import { env } from "@/env";
import { getSessionUser } from "@/lib/auth/gtm";
import {
  BROWSER_HEADERS,
  INVERTED_ASSET,
  extractMetaContent,
  fetchLogoAsImage,
  fetchManifestBrand,
  logoCandidatesFromHtml,
  resolveLogoCandidates,
  resolveUrl,
} from "@/lib/branding/brand-sources";

interface ExtractedTheme {
  theme: Partial<WidgetTheme>;
  branding: Partial<WidgetBranding>;
}

interface ModelResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string | null;
}

/** The model's answer: theme fields plus the two judgement calls we ask for. */
type ThemeJson = Partial<WidgetTheme> & {
  prospectName?: string;
  isDark?: boolean;
  logoIsLightOnDark?: boolean;
};

/** Anthropic's server-side sampling loop caps out at 10 iterations and returns
 * `pause_turn`; replaying the paused turn resumes it. Two resumes is plenty for
 * a colour lookup and bounds the worst case. */
const MAX_SEARCH_RESUMES = 2;

/**
 * One themed extraction request, with web search enabled when the site gave us
 * nothing to read. Search is what stops the model reciting a plausible palette
 * from memory for a domain it only half-remembers.
 */
async function requestTheme(
  createMessage: (args: Record<string, unknown>) => Promise<ModelResponse>,
  userContent: unknown,
  withSearch: boolean,
): Promise<ModelResponse> {
  const messages: Array<{ role: string; content: unknown }> = [
    { role: "user", content: userContent },
  ];
  const args = {
    // claude-sonnet-4-20250514 retired June 15, 2026 and started 404-ing every
    // call here, silently degrading every extraction to the heuristic fallback.
    // claude-sonnet-5 is the documented replacement.
    //
    // ADAPTIVE thinking, not disabled: reading a brand colour off a logo and
    // reconciling it against page chrome is judgment, not extraction. Disabled,
    // ramp.com (lime/black) came back #eb5c2f. max_tokens has headroom because
    // thinking draws from the same budget, and more again when search results
    // are in play.
    model: "claude-sonnet-5",
    max_tokens: withSearch ? 8192 : 4096,
    thinking: { type: "adaptive" },
    ...(withSearch
      ? {
          tools: [
            { type: "web_search_20260209", name: "web_search", max_uses: 4 },
          ],
        }
      : {}),
  };

  let response = await createMessage({ ...args, messages });
  for (
    let resumes = 0;
    response.stop_reason === "pause_turn" && resumes < MAX_SEARCH_RESUMES;
    resumes++
  ) {
    // Replay the paused turn verbatim - it carries the thinking and
    // server_tool_use blocks the server needs to pick up where it stopped.
    messages.push({ role: "assistant", content: response.content });
    response = await createMessage({ ...args, messages });
  }
  return response;
}

/**
 * The theme JSON out of a response. Searched from the last text block
 * backwards: thinking never sits at index 0's expense alone, and a search turn
 * interleaves commentary blocks around the answer.
 */
function parseThemeJson(message: ModelResponse): ThemeJson {
  const texts = message.content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string);

  for (const text of texts.reverse()) {
    const jsonText = text
      .trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
    try {
      const parsed: unknown = JSON.parse(jsonText);
      if (parsed && typeof parsed === "object") return parsed as ThemeJson;
    } catch {
      // Commentary, not the answer - keep looking.
    }
  }
  throw new Error("No theme JSON in the model response");
}

/**
 * Extract theme and branding from a website URL using AI.
 * Falls back to basic extraction if no API key is provided.
 */
export async function extractThemeFromUrl(
  url: string,
): Promise<{ success: boolean; data?: ExtractedTheme; error?: string }> {
  // Server-side fetch of a caller-supplied URL - session required (SSRF guard).
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }
  try {
    if (!url.startsWith("http")) url = `https://${url}`;

    const baseUrl = new URL(url);
    const hostname = baseUrl.hostname.replace(/^www\./, "");

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) return extractThemeBasic(url, baseUrl);

    const response = await fetch(url, { headers: BROWSER_HEADERS });

    // A 403 is the norm for banks and anything behind bot protection. It is
    // NOT a reason to fail the whole import: the logo services and the model's
    // own knowledge of the brand are keyed on the domain, not the markup. We
    // continue with no HTML and let those carry it.
    const html = response.ok ? await response.text() : "";
    if (!response.ok) {
      console.warn(
        `[extract-theme] ${hostname} returned ${response.status}; continuing from domain-only sources`,
      );
    }
    const title = extractTitle(html) || hostname;

    const scrapedLogos = logoCandidatesFromHtml(html);
    const manifest = await fetchManifestBrand(html, baseUrl.origin);

    const logoCandidates = await resolveLogoCandidates(
      hostname,
      scrapedLogos,
      baseUrl.origin,
      manifest.icons,
    );
    const logo =
      logoCandidates[0] ??
      (scrapedLogos[0] ? resolveUrl(scrapedLogos[0], baseUrl.origin) : "");

    const truncatedHtml = truncateHtml(html, 15000);
    // Pull the logo as a base64 image so Claude can read the actual prospect
    // colors off pixels rather than guessing from the HTML. Banks especially
    // ship white CTAs on red/blue branded chrome — without this, Claude
    // sees `background-color: white` in the CSS and confidently returns
    // `primaryColor: #ffffff`.
    const logoImage = logo ? await fetchLogoAsImage(logo) : null;

    const promptText = `Analyze this prospect and extract a cohesive color theme for a payment widget. Prospect: ${hostname}

${
  logoImage
    ? "I've attached the prospect's logo as an image. Look at it FIRST — the dominant non-background colour in the logo is almost always the right primaryColor."
    : ""
}
${
  truncatedHtml
    ? `The HTML below is for layout/surface cues${logoImage ? "; the brand colour comes from the logo" : " and branding cues"}.\n\n\`\`\`html\n${truncatedHtml}\n\`\`\``
    : `The site returned no readable markup (bot protection), so there is no HTML to inspect. Use the web_search tool to find ${hostname}'s real brand colours before you answer - a brand, press or logo-usage page usually states exact hex values, and recall alone invents plausible-but-wrong palettes. If search turns up nothing specific to this brand, return neutral surfaces rather than guessing.`
}

${
  manifest.themeColor
    ? `The site DECLARES its brand colour as ${manifest.themeColor} in its web app manifest. Treat that as authoritative for primaryColor unless the logo plainly contradicts it.\n`
    : ""
}
Return a JSON theme object using hex colors (e.g., "#a855f7"). CRITICAL rules for colour selection:
- \`primaryColor\` MUST be a saturated prospect colour from the logo or branded chrome. NEVER return #ffffff or #000000 (or any near-white / near-black hex) for primaryColor unless the prospect is genuinely monochromatic (Apple, Nike-style). If the site shows white CTAs sitting on a saturated background, pick the SATURATED background, not the white CTA.
- \`accentColor\` same constraint — saturated, prospect-aligned. Often equal to primaryColor.
- Neutrals belong on \`pageBackground\`, \`background\`, \`borderColor\`, \`mutedTextColor\` only.

Schema:
{
  "isDark": boolean (true if the site uses a dark theme),
  "pageBackground": "hex",
  "background": "hex",
  "foreground": "hex",
  "primaryColor": "hex (saturated prospect colour, per the rules above)",
  "primaryHoverColor": "hex (slightly darker variant of primaryColor)",
  "accentColor": "hex (saturated prospect-aligned colour)",
  "rowBackground": "hex",
  "rowHoverBackground": "hex",
  "mutedTextColor": "hex",
  "borderColor": "hex",
  "gradientFrom": "rgba color (e.g., rgba(168, 85, 247, 0.15))",
  "gradientTo": "transparent",
  "borderRadius": "xs" | "sm" | "md" | "lg",
  "prospectName": "the prospect/company name",
  "logoIsLightOnDark": boolean (true ONLY if the ATTACHED logo image is drawn in white or near-white ink, i.e. it is the variant meant to sit on a dark or coloured background and would be invisible on white. Judge the ink of the mark itself, not any background baked into the image.)
}

Return ONLY the JSON object, no explanation or markdown.`;

    const userContent: Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: {
            type: "base64";
            media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
            data: string;
          };
        }
    > = [];
    if (logoImage) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: logoImage.mediaType,
          data: logoImage.base64,
        },
      });
    }
    userContent.push({ type: "text", text: promptText });

    const client = new Anthropic({ apiKey });
    // SDK 0.71.2 types predate adaptive thinking, so the call goes through a
    // narrow local signature rather than a cast that would also erase the
    // response shape.
    const createMessage = client.messages.create.bind(client.messages) as unknown as (
      args: Record<string, unknown>,
    ) => Promise<ModelResponse>;
    // Search only when there is no markup to read. It is the fallback for a
    // site behind bot protection, not a per-import cost on every extraction.
    const withSearch = !truncatedHtml;
    let message;
    try {
      message = await requestTheme(createMessage, userContent, withSearch);
    } catch (err) {
      // Error level with a stable tag so log drains/alerts catch it - the
      // sonnet-4 retirement hid behind an untagged warn here for a month.
      console.error(
        `[extract-theme:anthropic-failure] falling back to basic heuristic for ${baseUrl}`,
        err,
      );
      return extractThemeBasic(url, baseUrl);
    }

    const parsed = parseThemeJson(message);

    const theme: Partial<WidgetTheme> = {
      pageBackground: parsed.pageBackground,
      background: parsed.background,
      foreground: parsed.foreground,
      primaryColor: parsed.primaryColor,
      primaryHoverColor: parsed.primaryHoverColor,
      accentColor: parsed.accentColor,
      rowBackground: parsed.rowBackground,
      rowHoverBackground: parsed.rowHoverBackground,
      mutedTextColor: parsed.mutedTextColor,
      borderColor: parsed.borderColor,
      gradientFrom: parsed.gradientFrom,
      gradientTo: parsed.gradientTo || "transparent",
      borderRadius: parsed.borderRadius,
    };

    // The model has the logo in front of it, so it can tell us whether the ink
    // is white. Wells Fargo's `wf_logo_220x23.png` is the correct wordmark and
    // carries no filename hint - the only way to know it disappears on a light
    // surface is to look at it. When it does, fall through to the next
    // reachable asset that is not an inverted variant: a visible square mark
    // beats an invisible wordmark. The operator can still pick any of the
    // candidates by hand - see `lib/actions/logo-options.ts`.
    const chosenLogo =
      parsed.logoIsLightOnDark === true
        ? (logoCandidates
            .slice(1)
            .find((candidate) => !INVERTED_ASSET.test(candidate)) ?? logo)
        : logo;

    const branding: Partial<WidgetBranding> = {
      name: parsed.prospectName || cleanProspectName(title),
      logo: resolveUrl(chosenLogo, baseUrl.origin),
      showPoweredBy: true,
    };

    return { success: true, data: { theme, branding } };
  } catch (error) {
    console.error("Failed to extract theme:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract theme",
    };
  }
}

async function extractThemeBasic(
  url: string,
  baseUrl: URL,
): Promise<{ success: boolean; data?: ExtractedTheme; error?: string }> {
  try {
    const response = await fetch(url, { headers: BROWSER_HEADERS });

    // Same as the AI path: bot protection must not abort the import. Without
    // markup this still yields the domain's logo and neutral defaults, which
    // beats returning nothing.
    const html = response.ok ? await response.text() : "";
    const hostname = baseUrl.hostname.replace(/^www\./, "");

    const title =
      extractMetaContent(html, "og:site_name") ||
      extractMetaContent(html, "og:title") ||
      extractTitle(html) ||
      baseUrl.hostname;

    const scrapedLogos = logoCandidatesFromHtml(html);
    const [logo = ""] = await resolveLogoCandidates(
      hostname,
      scrapedLogos,
      baseUrl.origin,
    );

    const themeColor =
      extractMetaContent(html, "theme-color") ||
      extractMetaContent(html, "msapplication-TileColor");

    const theme: Partial<WidgetTheme> = {
      pageBackground: "#f6f8fa",
      background: "#ffffff",
      foreground: "#000000",
      rowBackground: "#f6f8f8",
      rowHoverBackground: "#eef1f1",
      mutedTextColor: "#9a9a9a",
      borderColor: "#e7e8ed",
      gradientFrom: themeColor ? `${themeColor}15` : "#daffff",
      gradientTo: "transparent",
    };

    if (themeColor) {
      theme.primaryColor = themeColor;
      theme.accentColor = themeColor;
    }

    const branding: Partial<WidgetBranding> = {
      name: cleanProspectName(title),
      logo: resolveUrl(logo, baseUrl.origin),
      showPoweredBy: true,
    };

    return { success: true, data: { theme, branding } };
  } catch (error) {
    console.error("Failed to extract theme (basic):", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract theme",
    };
  }
}

function truncateHtml(html: string, maxLength: number): string {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[0] : "";

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[0] : html;

  const combined = head + "\n" + body;
  if (combined.length <= maxLength) return combined;

  return combined.slice(0, maxLength) + "\n<!-- truncated -->";
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function cleanProspectName(title: string): string {
  return title
    .replace(/\s*[-|–—]\s*.+$/, "")
    .replace(/\s*\|.+$/, "")
    .trim();
}
