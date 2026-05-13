/**
 * Success-path test for create-demo-app.
 *
 * Expensive — runs full scaffolding + typecheck inside a worktree.
 * Each invocation can take 10-15 minutes and spawns a real Claude Code
 * session.
 *
 * Local-only — requires an Anthropic API key. Run with
 * `pnpm test:skill:success` after substantive edits to `SKILL.md` or the
 * success fixture. No CI gate (this repo doesn't have a CI Anthropic API
 * key configured).
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertFixtureExpectations,
  runSkillAgainstFixture,
  type SkillRunResult,
} from "./harness";

const FIXTURE_DIR = path.resolve(__dirname, "../fixtures");

let cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});

describe("create-demo-app success path (main-only)", () => {
  it(
    "scaffolds stablecoin sandwich end-to-end and typechecks",
    () => {
      const result = runSkillAgainstFixture(
        path.join(FIXTURE_DIR, "success-stablecoin-sandwich.md"),
        { timeoutMs: 15 * 60_000 },
      );
      cleanups.push(result.cleanup);

      // Branch created and named per the convention
      const branches = execSync("git branch --list 'skill/*'", {
        cwd: result.worktreeRoot,
      })
        .toString()
        .trim();
      expect(branches).toMatch(/skill\/acme-sandwich-\d+/);

      // Frontmatter-declared phrase / file assertions
      assertFixtureExpectations(
        path.join(FIXTURE_DIR, "success-stablecoin-sandwich.md"),
        result,
      );

      // The generated app must typecheck cleanly
      execSync(
        "pnpm install --frozen-lockfile && pnpm --filter '@dynamic-demos/acme-sandwich' typecheck",
        {
          cwd: result.worktreeRoot,
          stdio: "inherit",
        },
      );
    },
    15 * 60_000,
  );
});
