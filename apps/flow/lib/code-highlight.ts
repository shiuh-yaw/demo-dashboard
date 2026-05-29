import "server-only";
import { createHighlighter, type Highlighter } from "shiki";

/**
 * Server-side Shiki highlighter. Initialised lazily and cached across
 * requests; only loads the languages + theme we actually use so module
 * cost stays bounded.
 */

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["typescript", "bash", "json"],
    });
  }
  return highlighterPromise;
}

export type HighlightLang = "typescript" | "bash" | "json";

export async function highlight(
  code: string,
  lang: HighlightLang,
): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang,
    theme: "github-dark",
  });
}
