import { createHighlighter, type Highlighter } from "shiki";

/**
 * Server-side Shiki highlighter - flow/wallet's lazy-singleton pattern.
 * Only imported from server components/tests.
 */

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["typescript", "tsx", "bash"],
    });
  }
  return highlighterPromise;
}

export type HighlightLang = "typescript" | "tsx" | "bash";

export async function highlight(
  code: string,
  lang: HighlightLang,
): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, { lang, theme: "github-dark" });
}
