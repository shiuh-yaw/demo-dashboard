#!/usr/bin/env node
// scripts/teardown-vercel-project.mjs
//
// Delete the Vercel project for `apps/<app-name>`.
//
// Phase 6B of the demo meta-system. See
// docs/projects/demo-meta-system/phases/06-skill.md.
//
// Usage:
//   pnpm teardown:deploy <app-name>            (interactive confirm)
//   pnpm teardown:deploy <app-name> --yes      (skip confirm — for CI/scripts)
//
// Requires `VERCEL_TOKEN` in the environment. Exits 0 when the project does
// not exist (idempotent).

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { createVercelFetch, findProject } from "./vercel-api.mjs";

/**
 * The Vercel project name used by every deploy in this monorepo. Mirrors
 * `projectNameFor` in `setup-vercel-project.mjs` — single source of truth.
 */
export function projectNameFor(appName) {
  return `dynamic-demos-${appName}`;
}

/**
 * Default confirmation prompt — reads a line from stdin and resolves true
 * when the answer matches `appName` exactly. Extracted so tests can pass a
 * stubbed prompt instead of piping stdin.
 */
async function defaultConfirm(appName) {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
      `Type the app name to confirm deletion of dynamic-demos-${appName}: `,
    );
    return answer.trim() === appName;
  } finally {
    rl.close();
  }
}

/**
 * Core orchestration extracted so tests can drive it with a mocked
 * `vercelFetch` + `confirm` callback. Returns one of:
 *  - `{ deleted: true,  projectName }`     — successful delete
 *  - `{ deleted: false, projectName, reason: 'not-found' }`
 *  - `{ deleted: false, projectName, reason: 'declined' }`
 *
 * @param {{
 *   appName: string,
 *   vercelFetch: ReturnType<typeof createVercelFetch>,
 *   skipConfirm?: boolean,
 *   confirm?: (appName: string) => Promise<boolean>,
 *   logger?: { log: (...args: unknown[]) => void, warn?: (...args: unknown[]) => void },
 * }} args
 */
export async function teardownProject({
  appName,
  vercelFetch,
  skipConfirm = false,
  confirm = defaultConfirm,
  logger = console,
}) {
  if (!appName) {
    throw new Error("app-name is required");
  }
  const projectName = projectNameFor(appName);

  const existing = await findProject(vercelFetch, projectName);
  if (!existing) {
    logger.log(
      `[teardown-vercel-project] ${projectName} does not exist — nothing to do.`,
    );
    return { deleted: false, projectName, reason: "not-found" };
  }

  if (!skipConfirm) {
    const ok = await confirm(appName);
    if (!ok) {
      logger.log(
        `[teardown-vercel-project] Confirmation did not match — aborting.`,
      );
      return { deleted: false, projectName, reason: "declined" };
    }
  }

  await vercelFetch(`/v9/projects/${encodeURIComponent(projectName)}`, {
    method: "DELETE",
  });
  logger.log(`[teardown-vercel-project] Deleted ${projectName}.`);

  return { deleted: true, projectName };
}

// --- CLI entry point -------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const appName = args.find((a) => !a.startsWith("--"));
  const skipConfirm = args.includes("--yes");

  if (!appName) {
    console.error(
      "Usage: pnpm teardown:deploy <app-name> [--yes]\n       node scripts/teardown-vercel-project.mjs <app-name> [--yes]",
    );
    process.exit(2);
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error(
      "VERCEL_TOKEN is not set. Provision a token at https://vercel.com/account/tokens, then re-run.",
    );
    process.exit(1);
  }

  try {
    const vercelFetch = createVercelFetch({ token });
    await teardownProject({ appName, vercelFetch, skipConfirm });
  } catch (err) {
    console.error(`[teardown-vercel-project] ${err.message}`);
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("teardown-vercel-project.mjs")
) {
  main();
}
