"use server";

import Anthropic from "@anthropic-ai/sdk";
import type { WidgetTheme, WidgetBranding } from "@/lib/widget-config";
import { env } from "@/env";

interface ExtractedTheme {
  theme: Partial<WidgetTheme>;
  branding: Partial<WidgetBranding>;
}

/**
 * Extract theme and branding from a website URL using AI.
 * Falls back to basic extraction if no API key is provided.
 */
export async function extractThemeFromUrl(
  url: string
): Promise<{ success: boolean; data?: ExtractedTheme; error?: string }> {
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
      baseUrl.origin
    );

    const truncatedHtml = truncateHtml(html, 15000);

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this website's design and extract a cohesive color theme for a payment widget. The website is: ${hostname}

Here's the HTML content:
\`\`\`html
${truncatedHtml}
\`\`\`

Based on the website's design language, CSS, and branding, generate a JSON theme object with these exact properties. Use hex colors (e.g., "#a855f7") for all color values:

{
  "isDark": boolean (true if the site uses a dark theme),
  "pageBackground": "hex color for the overall page background",
  "background": "hex color for the widget card background",
  "foreground": "hex color for primary text",
  "primaryColor": "hex color for primary buttons and CTAs",
  "primaryHoverColor": "hex color for primary button hover state",
  "accentColor": "hex color for accents and highlights",
  "rowBackground": "hex color for list item backgrounds",
  "rowHoverBackground": "hex color for list item hover state",
  "mutedTextColor": "hex color for secondary/muted text",
  "borderColor": "hex color for borders and dividers",
  "gradientFrom": "rgba color for gradient start (e.g., rgba(168, 85, 247, 0.15))",
  "gradientTo": "transparent",
  "borderRadius": "xs" | "sm" | "md" | "lg" (based on the site's roundedness),
  "brandName": "the brand/company name"
}

Return ONLY the JSON object, no explanation or markdown.`,
        },
      ],
    });

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
      name: parsed.brandName || cleanBrandName(title),
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
  baseUrl: URL
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
      baseUrl.origin
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
      name: cleanBrandName(title),
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
      "i"
    )
  );
  if (propertyMatch) return propertyMatch[1];

  const nameMatch = html.match(
    new RegExp(
      `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i"
    )
  );
  if (nameMatch) return nameMatch[1];

  const reversedMatch = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      "i"
    )
  );
  if (reversedMatch) return reversedMatch[1];

  return null;
}

function extractLinkHref(html: string, rel: string): string | null {
  const match = html.match(
    new RegExp(
      `<link[^>]*rel=["'][^"']*${rel}[^"']*["'][^>]*href=["']([^"']+)["']`,
      "i"
    )
  );
  if (match) return match[1];

  const reversedMatch = html.match(
    new RegExp(
      `<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*${rel}[^"']*["']`,
      "i"
    )
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

function cleanBrandName(title: string): string {
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

async function getValidLogoUrl(
  clearbitUrl: string,
  fallbackUrl: string,
  baseOrigin: string
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
