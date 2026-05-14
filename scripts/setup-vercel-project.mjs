#!/usr/bin/env node
// scripts/setup-vercel-project.mjs
//
// Provision a Vercel project for `apps/<app-name>`.
//
// Phase 6B of the demo meta-system. See
// docs/projects/demo-meta-system/phases/06-skill.md.
//
// Usage:
//   pnpm setup:deploy <app-name>
//   node scripts/setup-vercel-project.mjs <app-name>
//
// Requires `VERCEL_TOKEN` in the environment. Sandbox-by-default per D-005:
// env vars from `.env.example` are uploaded as `production`-target
// placeholders; the operator populates real values via the Vercel dashboard
// or CLI. We never echo or transmit real secrets through this script.
//
// Idempotent: re-running on an existing project logs a notice and exits 0.

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createVercelFetch, findProject } from "./vercel-api.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(__filename, "..", "..");

/**
 * Parse a dotenv-style `.env.example` into an array of `{ key, value }` records
 * preserving the file's declaration order. `value` is always the literal
 * placeholder from `.env.example` — typically empty, intended to be filled
 * with real values via the Vercel dashboard / CLI.
 *
 * - Skips blank lines and comments (`# ...`).
 * - Strips inline `# ...` comments after the value.
 * - Strips surrounding single or double quotes from the value.
 * - Skips lines without `=`.
 */
export function parseEnvExample(contents) {
  const entries = [];
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!key) continue;

    let value = line.slice(eq + 1);
    // strip inline comments — naive, fine for `KEY=value # comment`
    const hashAt = value.indexOf(" #");
    if (hashAt !== -1) value = value.slice(0, hashAt);
    value = value.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries.push({ key, value });
  }
  return entries;
}

/**
 * Read `apps/<app-name>/package.json` and `.env.example`. Throws when the app
 * directory or its `package.json` is missing.
 *
 * `.env.example` is optional — apps without one produce an empty env list.
 *
 * @param {{ repoRoot: string, appName: string, readFileImpl?: typeof readFile }} args
 */
export async function loadAppInputs({
  repoRoot,
  appName,
  readFileImpl = readFile,
}) {
  const appDir = join(repoRoot, "apps", appName);
  const pkgPath = join(appDir, "package.json");

  let pkg;
  try {
    pkg = JSON.parse(await readFileImpl(pkgPath, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`apps/${appName}/package.json not found`);
    }
    throw err;
  }

  let envEntries = [];
  try {
    const envPath = join(appDir, ".env.example");
    const envText = await readFileImpl(envPath, "utf8");
    envEntries = parseEnvExample(envText);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  return { appDir, pkg, envEntries };
}

/**
 * The Vercel project name used by every deploy in this monorepo. Single
 * source of truth — both setup + teardown call this.
 */
export function projectNameFor(appName) {
  return `dynamic-demos-${appName}`;
}

/**
 * Core orchestration extracted so tests can drive it with a mocked
 * `vercelFetch` and `readFileImpl`. Returns `{ created, projectName }`.
 *
 *  - `created = true`  → project was newly created
 *  - `created = false` → project already existed (idempotent no-op for create)
 *
 * Env vars from `.env.example` are POSTed as `production` placeholders only
 * for newly-created projects. Re-runs do not re-upload env vars (avoids
 * clobbering operator-set real values).
 *
 * @param {{
 *   appName: string,
 *   vercelFetch: ReturnType<typeof createVercelFetch>,
 *   repoRoot?: string,
 *   readFileImpl?: typeof readFile,
 *   logger?: { log: (...args: unknown[]) => void, warn?: (...args: unknown[]) => void },
 * }} args
 */
export async function setupProject({
  appName,
  vercelFetch,
  repoRoot = REPO_ROOT,
  readFileImpl = readFile,
  logger = console,
}) {
  if (!appName) {
    throw new Error("app-name is required");
  }
  const projectName = projectNameFor(appName);

  const { envEntries } = await loadAppInputs({
    repoRoot,
    appName,
    readFileImpl,
  });

  const existing = await findProject(vercelFetch, projectName);
  if (existing) {
    logger.log(
      `[setup-vercel-project] ${projectName} already exists — skipping create.`,
    );
    return { created: false, projectName, envCount: 0 };
  }

  // Create the project. Vercel's POST /v10/projects accepts `name`,
  // `framework`, `rootDirectory`, plus optional `gitRepository`. We omit
  // `gitRepository` — the operator wires the GitHub integration via the
  // Vercel dashboard since org-level link config varies.
  await vercelFetch(`/v10/projects`, {
    method: "POST",
    body: JSON.stringify({
      name: projectName,
      framework: "nextjs",
      rootDirectory: `apps/${appName}`,
    }),
  });

  logger.log(
    `[setup-vercel-project] Created ${projectName} (framework=nextjs, rootDirectory=apps/${appName}).`,
  );

  let envCount = 0;
  for (const { key } of envEntries) {
    // Always upload as a placeholder. We never read real values from the
    // operator's `.env` — that would risk leaking credentials into the
    // script's stdin/stdout/argv surface.
    await vercelFetch(
      `/v10/projects/${encodeURIComponent(projectName)}/env`,
      {
        method: "POST",
        body: JSON.stringify({
          key,
          value: "",
          type: "encrypted",
          target: ["production"],
        }),
      },
    );
    envCount += 1;
  }

  if (envCount > 0) {
    logger.log(
      `[setup-vercel-project] Uploaded ${envCount} env var placeholder(s) (target=production).`,
    );
    logger.log(
      "[setup-vercel-project] NEXT STEP: populate real values via the Vercel dashboard or `vercel env`. This script never transmits real secrets.",
    );
  }

  return { created: true, projectName, envCount };
}

// --- CLI entry point -------------------------------------------------------

async function main() {
  const appName = process.argv[2];
  if (!appName) {
    console.error(
      "Usage: pnpm setup:deploy <app-name>\n       node scripts/setup-vercel-project.mjs <app-name>",
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
    await setupProject({ appName, vercelFetch });
  } catch (err) {
    console.error(`[setup-vercel-project] ${err.message}`);
    process.exit(1);
  }
}

// Run when invoked directly. `import.meta.url` comparison handles both
// `node scripts/...` and pnpm-script invocations.
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("setup-vercel-project.mjs")
) {
  main();
}
