import { createHighlighter, type Highlighter } from "shiki";

/**
 * Server-side Shiki highlighter — flow's lazy-singleton pattern
 * (apps/flow/lib/code-highlight.ts). Only imported from server
 * components/tests; no "server-only" marker because that package
 * isn't a declared workspace dep (flow relies on hoisting; we don't).
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
