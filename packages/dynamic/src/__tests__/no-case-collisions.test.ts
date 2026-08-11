import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");

function sourceFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

/** Two modules may not share a case-insensitive path: webpack mis-resolves them. */
describe("module paths", () => {
  it("has no two modules differing only by case", () => {
    const byLowerCase = new Map<string, string[]>();
    for (const file of sourceFilesUnder(SRC)) {
      const key = file.replace(/\.(ts|tsx)$/, "").toLowerCase();
      byLowerCase.set(key, [...(byLowerCase.get(key) ?? []), file]);
    }
    const collisions = [...byLowerCase.values()].filter((f) => f.length > 1);
    expect(collisions).toEqual([]);
  });
});
