import { createHighlighter, type Highlighter } from "shiki";

/**
 * Server-side Shiki highlighter - the lazy-singleton every scenario
 * app shared as a local copy (originated in flow, copied to wallet /
 * earn / trade). Initialised on first use and cached across requests;
 * only the languages + theme the demos actually use are loaded so
 * module cost stays bounded.
 *
 * Only import from server components / route handlers / tests. No
 * `server-only` marker on purpose: the apps' snippet tests exercise
 * `highlight` under plain vitest, where that marker throws.
 */

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["typescript", "tsx", "bash", "json"],
    });
  }
  return highlighterPromise;
}

export type HighlightLang = "typescript" | "tsx" | "bash" | "json";

export async function highlight(
  code: string,
  lang: HighlightLang,
): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, { lang, theme: "github-dark" });
}
