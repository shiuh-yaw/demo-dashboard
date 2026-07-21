"use server";

import Anthropic from "@anthropic-ai/sdk";
import type { WidgetTheme, WidgetBranding } from "@/lib/widget-config";
import { env } from "@/env";
import { getSessionUser } from "@/lib/auth/gtm";

interface ExtractedTheme {
  theme: Partial<WidgetTheme>;
  branding: Partial<WidgetBranding>;
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

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ThemeExtractor/1.0; +https://dynamic.xyz)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch website: ${response.status}`,
      };
    }

    const html = await response.text();
    const title = extractTitle(html) || hostname;

    const clearbitLogo = `https://logo.clearbit.com/${hostname}`;
    const extractedLogo = extractLogoFromHtml(html) || "";

    const logo = await getValidLogoUrl(
      clearbitLogo,
      extractedLogo,
      baseUrl.origin,
    );

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
    ? "I've attached the prospect's logo as an image. Look at it FIRST — the dominant non-background colour in the logo is almost always the right primaryColor. The HTML below is for layout/surface cues only; the prospect colour comes from the logo."
    : "Look at the HTML below for design language, CSS, and branding cues."
}

\`\`\`html
${truncatedHtml}
\`\`\`

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
  "prospectName": "the prospect/company name"
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
    let message;
    try {
      message = await client.messages.create({
        // claude-sonnet-4-20250514 retired June 15, 2026 and started
        // 404-ing every call here, silently degrading every extraction to
        // the heuristic fallback below. claude-sonnet-5 is the documented
        // replacement. Thinking is explicitly disabled: this is a single
        // short structured-JSON extraction, not a reasoning task, and
        // Sonnet 5 runs adaptive thinking by default when omitted.
        model: "claude-sonnet-5",
        max_tokens: 1024,
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: userContent }],
      });
    } catch (err) {
      // Error level with a stable tag so log drains/alerts catch it - the
      // sonnet-4 retirement hid behind an untagged warn here for a month.
      console.error(
        `[extract-theme:anthropic-failure] falling back to basic heuristic for ${baseUrl}`,
        err,
      );
      return extractThemeBasic(url, baseUrl);
    }

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);

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

    const branding: Partial<WidgetBranding> = {
      name: parsed.prospectName || cleanProspectName(title),
      logo: resolveUrl(logo, baseUrl.origin),
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
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ThemeExtractor/1.0; +https://dynamic.xyz)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch website: ${response.status}`,
      };
    }

    const html = await response.text();
    const hostname = baseUrl.hostname.replace(/^www\./, "");

    const title =
      extractMetaContent(html, "og:site_name") ||
      extractMetaContent(html, "og:title") ||
      extractTitle(html) ||
      baseUrl.hostname;

    const clearbitLogo = `https://logo.clearbit.com/${hostname}`;
    const extractedLogo = extractLogoFromHtml(html) || "";

    const logo = await getValidLogoUrl(
      clearbitLogo,
      extractedLogo,
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

function extractMetaContent(html: string, name: string): string | null {
  const propertyMatch = html.match(
    new RegExp(
      `<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
  );
  if (propertyMatch) return propertyMatch[1];

  const nameMatch = html.match(
    new RegExp(
      `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
  );
  if (nameMatch) return nameMatch[1];

  const reversedMatch = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      "i",
    ),
  );
  if (reversedMatch) return reversedMatch[1];

  return null;
}

function extractLinkHref(html: string, rel: string): string | null {
  const match = html.match(
    new RegExp(
      `<link[^>]*rel=["'][^"']*${rel}[^"']*["'][^>]*href=["']([^"']+)["']`,
      "i",
    ),
  );
  if (match) return match[1];

  const reversedMatch = html.match(
    new RegExp(
      `<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*${rel}[^"']*["']`,
      "i",
    ),
  );
  return reversedMatch ? reversedMatch[1] : null;
}

function extractLogoFromHtml(html: string): string | null {
  const metaCandidates = [
    extractMetaContent(html, "og:logo"),
    extractMetaContent(html, "og:image"),
    extractMetaContent(html, "twitter:image"),
    extractMetaContent(html, "twitter:image:src"),
  ];

  const linkCandidates = [
    extractLinkHref(html, "apple-touch-icon"),
    extractLinkHref(html, "apple-touch-icon-precomposed"),
    extractLinkHref(html, "mask-icon"),
    extractLinkHref(html, "logo"),
  ];

  const imgCandidates: string[] = [];
  const imgPatterns = [
    /<img[^>]*src=["']([^"']+)["'][^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*>/i,
    /<img[^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/i,
    /<img[^>]*src=["']([^"']*logo[^"']+)["'][^>]*>/i,
  ];

  for (const pattern of imgPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      imgCandidates.push(match[1]);
    }
  }

  const candidates = [...metaCandidates, ...linkCandidates, ...imgCandidates]
    .filter(Boolean)
    .map((candidate) => String(candidate));

  return candidates.find((candidate) => !/favicon/i.test(candidate)) || null;
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

function resolveUrl(url: string, baseOrigin: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${baseOrigin}${url}`;
  return `${baseOrigin}/${url}`;
}

/**
 * Fetch a logo URL and return it as base64 + media type, suitable for
 * embedding as an `image` content block in the Anthropic Messages API.
 *
 * Returns `null` when the URL is unreachable, non-image, an unsupported
 * format (e.g. SVG — Anthropic's vision endpoint accepts PNG/JPEG/GIF/WebP
 * only), or larger than Anthropic's per-image cap (~5 MB).
 */
async function fetchLogoAsImage(
  url: string,
): Promise<{
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
} | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ThemeExtractor/1.0; +https://dynamic.xyz)",
      },
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const supported = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
    ] as const;
    const mediaType = supported.find((t) => contentType.startsWith(t));
    if (!mediaType) return null;
    const buf = await res.arrayBuffer();
    // Anthropic caps inline images at 5 MB. Reject larger payloads rather
    // than letting the API error and pull the whole import down with it.
    if (buf.byteLength > 5_000_000) return null;
    const base64 = Buffer.from(buf).toString("base64");
    return { base64, mediaType };
  } catch {
    return null;
  }
}

async function getValidLogoUrl(
  clearbitUrl: string,
  fallbackUrl: string,
  baseOrigin: string,
): Promise<string> {
  try {
    const response = await fetch(clearbitUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ThemeExtractor/1.0)",
      },
    });

    if (response.ok) {
      return clearbitUrl;
    }
  } catch {
    // fall back
  }

  return resolveUrl(fallbackUrl, baseOrigin);
}
