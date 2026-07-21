/**
 * Test-only assertions for authored code-step content - the checks
 * wallet / earn / trade each copied into their code-steps tests.
 * Framework-agnostic (throws plain Errors, so it reads as a failed
 * assertion under vitest); separate export path so importing it never
 * loads Shiki.
 */

export interface AuthoredCodeStep {
  num: string;
  title: string;
  prose: string;
  filename: string;
  code: string;
  docsUrl: string;
  lang?: string;
}

/**
 * Every step carries non-empty content, `num` is two digits, docs URLs
 * point at dynamic.xyz docs, and every TypeScript snippet opens with
 * its import line (the workspace-wide snippet rule - snippets must be
 * copy-paste-runnable, not fragments).
 */
export function assertAuthoredCodeSteps(steps: AuthoredCodeStep[]): void {
  if (steps.length === 0) throw new Error("no code steps provided");
  for (const step of steps) {
    if (step.lang === "typescript" && !/^import /.test(step.code)) {
      throw new Error(`"${step.title}" is missing its import line`);
    }
    if (!/^\d\d$/.test(step.num)) {
      throw new Error(`"${step.title}" has a non-two-digit num: ${step.num}`);
    }
    for (const field of ["title", "prose", "filename"] as const) {
      if (step[field].length === 0) {
        throw new Error(`step ${step.num} has an empty ${field}`);
      }
    }
    if (step.code.trim().length === 0) {
      throw new Error(`"${step.title}" has an empty code block`);
    }
    if (!/^https:\/\/(www\.)?dynamic\.xyz\/docs\//.test(step.docsUrl)) {
      throw new Error(
        `"${step.title}" docsUrl is not a dynamic.xyz docs link: ${step.docsUrl}`,
      );
    }
  }
}
