#!/usr/bin/env node
// Lint every packages/*/AGENTS.md and apps/*/AGENTS.md against the
// schema described in `docs/templates/AGENTS.template.md` and codified
// in DECISIONS.md D-014.
//
// Checks:
//   - File parses (---yaml--- block + body).
//   - Required fields per kind: name, kind, flow_role, custody, status.
//   - For onramp/offramp: regions[] (each with country, currency, rails[]).
//   - For provider wrappers (provider field present): provider.name, .docs,
//     .api_reference, .agent_docs.
//   - File length <= 150 lines (per the template's authoring rules).
//   - All provider.* URL fields are syntactically valid (or the
//     "agent_docs: none" sentinel).
//
// Exits 0 on success, 1 on first error per file (after reporting all
// errors).
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { findAgentsMdFiles, readAgentsMd } from "./agents-md-shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), "..");

const VALID_FLOW_ROLES = new Set([
  "onramp",
  "wallet",
  "bridge",
  "offramp",
  "checkout",
  "payouts",
  "auth",
  "theming",
  "shared-ui",
  "utility",
]);

const VALID_CUSTODY = new Set(["non-custodial", "custodial", "mixed", "n/a"]);
const VALID_STATUS = new Set(["stable", "experimental", "stub"]);
const VALID_KIND = new Set(["package", "app", "integration"]);

const REQUIRED_PROVIDER_FIELDS = ["name", "docs", "api_reference", "agent_docs"];

const LIMIT_LINES = 150;

const errors = [];

function err(file, msg) {
  errors.push(`${relative(REPO_ROOT, file)}: ${msg}`);
}

function isValidUrl(s) {
  if (typeof s !== "string") return false;
  if (s === "none") return true;
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

const targets = findAgentsMdFiles(REPO_ROOT);
if (targets.length === 0) {
  console.error("No AGENTS.md files found. Aborting.");
  process.exit(1);
}

for (const t of targets) {
  const { frontmatter, lineCount } = readAgentsMd(t.path);
  if (!frontmatter) {
    err(t.path, "no frontmatter block (--- ... ---) found.");
    continue;
  }

  // Required base fields.
  for (const field of ["name", "kind", "flow_role", "custody", "status"]) {
    if (frontmatter[field] === undefined || frontmatter[field] === null || frontmatter[field] === "") {
      err(t.path, `missing required frontmatter field: ${field}`);
    }
  }
  if (frontmatter.kind && !VALID_KIND.has(frontmatter.kind)) {
    err(t.path, `invalid kind: ${frontmatter.kind}`);
  }
  if (frontmatter.flow_role && !VALID_FLOW_ROLES.has(frontmatter.flow_role)) {
    err(t.path, `invalid flow_role: ${frontmatter.flow_role}`);
  }
  if (frontmatter.custody && !VALID_CUSTODY.has(frontmatter.custody)) {
    err(t.path, `invalid custody: ${frontmatter.custody}`);
  }
  if (frontmatter.status && !VALID_STATUS.has(frontmatter.status)) {
    err(t.path, `invalid status: ${frontmatter.status}`);
  }

  // Regions required for onramp/offramp.
  if (frontmatter.flow_role === "onramp" || frontmatter.flow_role === "offramp") {
    if (!Array.isArray(frontmatter.regions) || frontmatter.regions.length === 0) {
      err(t.path, `flow_role: ${frontmatter.flow_role} requires non-empty regions[] in frontmatter (D-014).`);
    } else {
      for (const r of frontmatter.regions) {
        if (!r || !r.country || !r.currency || !Array.isArray(r.rails) || r.rails.length === 0) {
          err(t.path, `region entries require country, currency, and rails[]: ${JSON.stringify(r)}`);
        }
      }
    }
  }

  // Provider wrapper fields.
  if (frontmatter.provider) {
    for (const f of REQUIRED_PROVIDER_FIELDS) {
      if (frontmatter.provider[f] === undefined || frontmatter.provider[f] === "") {
        err(t.path, `provider.${f} is required when provider block is present (D-014).`);
      }
    }
    for (const f of ["docs", "api_reference", "agent_docs", "status_page", "changelog", "source"]) {
      if (frontmatter.provider[f] !== undefined && !isValidUrl(frontmatter.provider[f])) {
        err(t.path, `provider.${f} is not a valid URL (or the "none" sentinel): ${frontmatter.provider[f]}`);
      }
    }
  }

  // 150-line cap.
  if (lineCount > LIMIT_LINES) {
    err(t.path, `${lineCount} lines > ${LIMIT_LINES} (template authoring rule).`);
  }
}

if (errors.length > 0) {
  console.error(`AGENTS.md lint failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(`AGENTS.md lint passed (${targets.length} files).`);
