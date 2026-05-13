/**
 * Test harness for the create-demo-app skill.
 *
 * Spawns `claude -p` against a fresh git worktree per fixture, parses
 * the fixture's YAML frontmatter, and runs the declared assertions.
 *
 * Cost / determinism: each test invokes a real Claude Code session.
 * Failure-mode tests are cheap (zero file changes; usually <30s each).
 * Success-path tests are expensive (full scaffolding + typecheck);
 * gated to main-only CI.
 */

import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect } from "vitest";

export interface FixtureFrontmatter {
  prompt: string;
  expected_outcome: "success" | "failure";
  expected_class?: 1 | 2 | 3 | 4 | 5;
  expected_branch_pattern?: string;
  expected_files_created?: string[];
  must_contain?: string[];
  must_be_question_count?: number;
  must_not_change_files: boolean;
}

const FIXTURE_RE = /^---\n([\s\S]*?)\n---/;

/**
 * Parse the YAML frontmatter from a fixture file.
 *
 * Handles the narrow shape used by these fixtures:
 *   - Scalar string / boolean / integer values (`key: value`).
 *   - Block-style arrays of scalar strings (`key:` followed by `  - item` lines).
 *
 * Note: deliberately not pulling in a full YAML dep — the project uses a
 * similar narrow parser for AGENTS.md frontmatter
 * (scripts/agents-md-shared.mjs#parseFrontmatter). Keep this shape in sync.
 */
export function parseFixture(filePath: string): FixtureFrontmatter {
  const raw = readFileSync(filePath, "utf8");
  const match = raw.match(FIXTURE_RE);
  if (!match) throw new Error(`Fixture has no frontmatter: ${filePath}`);
  const yaml = match[1]!;
  const fm: Record<string, unknown> = {};
  let currentArrayKey: string | null = null;
  for (const line of yaml.split("\n")) {
    if (line.startsWith("  - ")) {
      if (!currentArrayKey) throw new Error(`Array item without key in ${filePath}: ${line}`);
      (fm[currentArrayKey] as string[]).push(line.slice(4).trim().replace(/^"(.*)"$/, "$1"));
      continue;
    }
    currentArrayKey = null;
    const m = line.match(/^([\w_]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, valueRaw] = m;
    const value = (valueRaw ?? "").trim();
    if (value === "") {
      fm[key!] = [];
      currentArrayKey = key!;
    } else if (value === "true") fm[key!] = true;
    else if (value === "false") fm[key!] = false;
    else if (/^-?\d+$/.test(value)) fm[key!] = parseInt(value, 10);
    else fm[key!] = value.replace(/^"(.*)"$/, "$1");
  }
  return fm as unknown as FixtureFrontmatter;
}

export interface SkillRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  worktreeRoot: string;
  filesChanged: string[];
  cleanup: () => void;
}

export function runSkillAgainstFixture(
  fixturePath: string,
  options: { timeoutMs?: number } = {},
): SkillRunResult {
  const fm = parseFixture(fixturePath);
  const repoRoot = execSync("git rev-parse --show-toplevel").toString().trim();
  const headSha = execSync("git rev-parse HEAD").toString().trim();

  const tempBase = mkdtempSync(path.join(tmpdir(), "skill-test-"));
  const worktreeRoot = path.join(tempBase, "worktree");
  execSync(`git worktree add --detach ${worktreeRoot} ${headSha}`, { cwd: repoRoot });

  const cleanup = () => {
    try {
      execSync(`git worktree remove --force ${worktreeRoot}`, { cwd: repoRoot });
    } catch {
      // ignore — best effort
    }
    rmSync(tempBase, { recursive: true, force: true });
  };

  const result = spawnSync(
    "claude",
    [
      "-p",
      fm.prompt,
      "--permission-mode",
      "bypassPermissions",
      "--output-format",
      "text",
    ],
    {
      cwd: worktreeRoot,
      encoding: "utf8",
      timeout: options.timeoutMs ?? 5 * 60_000,
      maxBuffer: 50 * 1024 * 1024,
    },
  );

  const filesChanged = execSync("git status --porcelain", { cwd: worktreeRoot })
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
    worktreeRoot,
    filesChanged,
    cleanup,
  };
}

export function assertFixtureExpectations(
  fixturePath: string,
  result: SkillRunResult,
): void {
  const fm = parseFixture(fixturePath);
  const stdoutLower = result.stdout.toLowerCase();

  if (fm.must_not_change_files) {
    expect(result.filesChanged, "skill should produce zero file changes").toEqual([]);
  }
  for (const phrase of fm.must_contain ?? []) {
    expect(
      stdoutLower,
      `stdout missing required phrase: "${phrase}"\n--- stdout ---\n${result.stdout}\n--- end stdout ---`,
    ).toContain(phrase.toLowerCase());
  }
  if (fm.must_be_question_count !== undefined) {
    const questionCount = (result.stdout.match(/\?/g) ?? []).length;
    expect(
      questionCount,
      `expected ~${fm.must_be_question_count} question(s); got ${questionCount}\n--- stdout ---\n${result.stdout}\n--- end stdout ---`,
    ).toBeGreaterThanOrEqual(fm.must_be_question_count);
    // Upper bound: questions shouldn't proliferate. Allow up to +2 for prose.
    expect(questionCount).toBeLessThanOrEqual(fm.must_be_question_count + 2);
  }
}
