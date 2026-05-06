// Shared helpers for AGENTS.md tooling. Pure Node, no deps.
//
// Public surface:
//   findAgentsMdFiles(repoRoot) -> Array<{ path: string, kind: "package" | "app", dir: string }>
//   readAgentsMd(absPath) -> { frontmatter: object, body: string, lineCount: number, raw: string }
//   parseFrontmatter(yamlBlock) -> object  (small, AGENTS.md-shaped subset of YAML)
//
// The parser is intentionally narrow: it handles the shapes seen in this
// repo's AGENTS.md frontmatter (scalars, scalar lists, nested objects up
// to one level, list-of-objects up to one level, # comments). A real YAML
// parser is overkill for the lint/registry use case and would add a dep
// during Phase 1F catalog stabilisation.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function findAgentsMdFiles(repoRoot) {
  const out = [];
  for (const kind of ["package", "app"]) {
    const dir = kind === "package" ? "packages" : "apps";
    const baseDir = join(repoRoot, dir);
    let entries;
    try {
      entries = readdirSync(baseDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const agentsMdPath = join(baseDir, entry.name, "AGENTS.md");
      try {
        statSync(agentsMdPath);
      } catch {
        continue;
      }
      out.push({ path: agentsMdPath, kind, dir: entry.name });
    }
  }
  return out;
}

export function readAgentsMd(absPath) {
  const raw = readFileSync(absPath, "utf8");
  const lineCount = raw.split("\n").length;
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    return { frontmatter: null, body: raw, lineCount, raw };
  }
  const frontmatter = parseFrontmatter(m[1]);
  return { frontmatter, body: m[2] ?? "", lineCount, raw };
}

// Minimal YAML-ish parser tailored to AGENTS.md frontmatter.
// Supported shapes (tested against every AGENTS.md in this repo):
//   key: value
//   key: "quoted value"
//   key: [item, item]
//   key:
//     subkey: value
//   regions:
//     - country: BR
//       currency: BRL
//       rails: [pix]
// Comments (#) at end of line are stripped.
export function parseFrontmatter(yamlBlock) {
  const lines = yamlBlock.split("\n");
  return parseBlock(lines, 0).value;
}

function parseBlock(lines, baseIndent) {
  const obj = {};
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    if (rawLine === undefined) {
      i++;
      continue;
    }
    const noComment = stripComment(rawLine);
    if (!noComment.trim()) {
      i++;
      continue;
    }
    const indent = leadingSpaces(noComment);
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      // unexpected over-indent; skip
      i++;
      continue;
    }
    const trimmed = noComment.slice(indent);

    // List item at this indent? (Means this isn't an object — caller handles.)
    if (trimmed.startsWith("- ")) {
      break;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }
    const key = trimmed.slice(0, colonIdx).trim();
    const after = trimmed.slice(colonIdx + 1).trim();

    if (after === "") {
      // nested block: array-of-objects, or object
      const childLines = collectChildren(lines, i + 1, indent);
      if (childLines.length === 0) {
        obj[key] = null;
        i++;
        continue;
      }
      const childIndent = leadingSpaces(childLines[0]);
      const firstChildTrim = childLines[0].slice(childIndent);
      if (firstChildTrim.startsWith("- ")) {
        obj[key] = parseList(childLines, childIndent);
      } else {
        obj[key] = parseBlock(childLines, childIndent).value;
      }
      i += 1 + childLines.length;
    } else if (after.startsWith("[") && after.endsWith("]")) {
      // inline list
      const inner = after.slice(1, -1).trim();
      obj[key] = inner === "" ? [] : inner.split(",").map((s) => unquote(s.trim()));
      i++;
    } else {
      obj[key] = unquote(after);
      i++;
    }
  }
  return { value: obj, consumed: i };
}

function parseList(lines, baseIndent) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = stripComment(lines[i]);
    if (!line.trim()) {
      i++;
      continue;
    }
    const indent = leadingSpaces(line);
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      i++;
      continue;
    }
    const trimmed = line.slice(indent);
    if (!trimmed.startsWith("- ")) break;
    // Treat the item: "- key: value" as the first key of an object.
    const itemFirstLine = trimmed.slice(2);
    const itemBlockLines = [" ".repeat(indent + 2) + itemFirstLine];
    let j = i + 1;
    while (j < lines.length) {
      const ln = stripComment(lines[j]);
      if (!ln.trim()) {
        j++;
        continue;
      }
      const ind = leadingSpaces(ln);
      if (ind <= baseIndent) break;
      itemBlockLines.push(ln);
      j++;
    }
    const obj = parseBlock(itemBlockLines, indent + 2).value;
    out.push(obj);
    i = j;
  }
  return out;
}

function collectChildren(lines, start, parentIndent) {
  const out = [];
  for (let k = start; k < lines.length; k++) {
    const ln = stripComment(lines[k]);
    if (!ln.trim()) {
      out.push(lines[k]);
      continue;
    }
    const ind = leadingSpaces(ln);
    if (ind <= parentIndent) break;
    out.push(lines[k]);
  }
  return out;
}

function leadingSpaces(s) {
  let n = 0;
  while (n < s.length && s[n] === " ") n++;
  return n;
}

function stripComment(line) {
  // Naive: only strip "#" comments that are clearly outside a quoted string.
  // AGENTS.md frontmatter uses simple values so this is safe.
  let inQuote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
    } else if (c === '"' || c === "'") {
      inQuote = c;
    } else if (c === "#") {
      return line.slice(0, i).replace(/\s+$/, "");
    }
  }
  return line;
}

function unquote(s) {
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return s.slice(1, -1);
    }
  }
  return s;
}
