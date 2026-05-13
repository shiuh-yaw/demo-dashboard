/**
 * Failure-mode regression suite for the create-demo-app skill.
 *
 * Each test spawns a real `claude -p` session against a fresh git worktree
 * allocated at the current HEAD. The skill's stdout and the worktree's
 * `git status` are asserted against the declarations in the fixture's YAML
 * frontmatter.
 *
 * Per fixture: ~30-90s on a warm machine. Total suite: ~3-8 minutes.
 *
 * Local-only — requires an Anthropic API key. Run with `pnpm test:skill`
 * before pushing changes that touch `.claude/skills/create-demo-app/`.
 * No CI gate (this repo doesn't have a CI Anthropic API key configured).
 */
import path from "node:path";
import { afterEach, describe, it } from "vitest";
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

function runFixture(name: string): SkillRunResult {
  const result = runSkillAgainstFixture(path.join(FIXTURE_DIR, name));
  cleanups.push(result.cleanup);
  return result;
}

describe("create-demo-app failure modes", () => {
  it(
    "class 1: no provider coverage → guidance + zero file changes",
    () => {
      const result = runFixture("failure-no-coverage.md");
      assertFixtureExpectations(path.join(FIXTURE_DIR, "failure-no-coverage.md"), result);
    },
    5 * 60_000,
  );

  it(
    "class 2: named provider wrong region → suggests alternatives",
    () => {
      const result = runFixture("failure-wrong-region.md");
      assertFixtureExpectations(path.join(FIXTURE_DIR, "failure-wrong-region.md"), result);
    },
    5 * 60_000,
  );

  it(
    "class 3: ambiguous corridor → exactly one disambiguation question",
    () => {
      const result = runFixture("failure-ambiguous.md");
      assertFixtureExpectations(path.join(FIXTURE_DIR, "failure-ambiguous.md"), result);
    },
    5 * 60_000,
  );

  it(
    "class 4: out of scope → reports demo-builder scope",
    () => {
      const result = runFixture("failure-out-of-scope.md");
      assertFixtureExpectations(path.join(FIXTURE_DIR, "failure-out-of-scope.md"), result);
    },
    5 * 60_000,
  );

  it(
    "class 5: missing piece → 3-option prompt with direct-in-app recommended",
    () => {
      const result = runFixture("failure-missing-piece.md");
      assertFixtureExpectations(path.join(FIXTURE_DIR, "failure-missing-piece.md"), result);
    },
    5 * 60_000,
  );
});
