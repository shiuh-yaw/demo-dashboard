/**
 * Chrome contract for scenario demos, enforced mechanically.
 *
 * Every branded demo needs the same five things, and each one has been shipped
 * missing at least once - found by a human looking at a screenshot, per demo,
 * repeatedly. Prose in a skill file doesn't stop that; this does.
 *
 * The check is deliberately crude - it greps each app's scenario page for the
 * primitive rather than rendering it. That trades precision for the property
 * that matters: a new demo cannot be added without either wiring the contract or
 * seeing this fail. If a demo has a genuine reason to skip a rule, add it to that
 * rule's `EXEMPT` set with the reason, so the exception is reviewable instead of
 * invisible.
 *
 * Scope: `apps/*` scenario pages, discovered from disk. New apps are picked up
 * automatically - there is no list here to forget to update.
 *
 * Lives in @dynamic-demos/theme rather than @dynamic-demos/ui (whose components
 * it checks for) only because ui has no test runner wired; theme owns branding
 * and already runs vitest.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APPS_DIR = join(__dirname, "../../../../apps");

/**
 * Scope, derived from source rather than a hand-kept list, so a new demo opts in
 * by being built normally.
 *
 * An app is THEMEABLE if it resolves a demo config (`fetchDemoConfig`) - that is
 * what makes it brandable for a prospect, and it's the widest scope here.
 *
 * A themeable app is SCENARIO-shaped if it also composes `ScenarioLayout`, and
 * CONSOLE-shaped otherwise (visa-direct: authenticated routes, its own shell, no
 * hero to hang a brand row on). The rules differ because the shapes do - a
 * console carries the brand in its header instead - but both must offer a way
 * out of a sticky theme.
 *
 * Out of scope by construction, correctly: the dashboard, spark26, and surfaces
 * that never read a config.
 */
const THEMEABLE_MARKER = "fetchDemoConfig";
const SCENARIO_MARKER = "ScenarioLayout";
/**
 * Console shape requires site chrome. Reading a config isn't enough on its own -
 * the embed surfaces (checkouts, deposit, shop) are themed but render no header
 * or footer at all, so there is nothing for these rules to be about.
 */
const CHROME_MARKER = "SiteHeader";

/**
 * The one app that trips every marker without being a branded demo: the
 * dashboard IS the demos catalog. It renders `SiteHeader` as its own marketing
 * header and reads demo configs to administer them, but no prospect config ever
 * themes it, so there is no brand to carry and no theme to reset.
 */
const NOT_A_DEMO = new Set(["dashboard"]);

/**
 * `buildScenarioChrome` satisfies every rule by construction - it returns all
 * five slots from one input - so an app that uses it passes without naming the
 * individual primitives. That is the preferred shape; the primitive names stay
 * accepted for apps that still assemble by hand.
 */
const COMPOSED_HELPER = "buildScenarioChrome";

type Shape = "scenario" | "console";

interface Rule {
  name: string;
  /** Any one of these substrings satisfies the rule. */
  needles: string[];
  why: string;
  /** Which shapes the rule applies to. */
  shapes: Shape[];
  exempt?: Set<string>;
}

const RULES: Rule[] = [
  {
    name: "brand header for the branded state",
    needles: ["ScenarioBrandRow"],
    why: "A branded demo drops <SiteHeader>; without the brand row it has no header at all.",
    shapes: ["scenario"],
  },
  {
    name: "shared footer (SiteFooter)",
    needles: ["SiteFooter"],
    why: "Marketing links and the book-a-call href must not be hand-rolled per app.",
    shapes: ["scenario"],
  },
  {
    name: "brand carried in the header",
    // `isBranded` on SiteHeader (visa-direct) or a bar-variant brand row (flow).
    needles: ["isBranded", "ScenarioBrandRow"],
    why: "A console has no hero, so the header itself must drop the Demos crumb and show the prospect mark.",
    shapes: ["console"],
  },
  {
    name: "theme reset (ResetThemeButton)",
    needles: ["ResetThemeButton"],
    why: "The theme cookie is sticky, so without this an operator is stuck in a prospect's brand.",
    shapes: ["scenario", "console"],
  },
];

/**
 * Roots to scan per app. Chrome legitimately lives in different files - wallet
 * and remittance wire the brand row in `app/page.tsx`, flow and card in
 * `app/layout.tsx` - so the check is "does this app wire it anywhere", not "is it
 * on this exact line". Scanning only the page produced false failures for every
 * app that chose the layout.
 */
const SOURCE_ROOTS = [
  "app",
  "src/app",
  "components",
  "src/components",
  // `lib` matters: connect resolves its config in lib/connect-config.ts, so
  // omitting it silently dropped that app out of scope entirely.
  "lib",
  "src/lib",
];

function collectTsx(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectTsx(full, out);
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))
      out.push(readFileSync(full, "utf8"));
  }
}

function themeableApps(): { app: string; source: string; shape: Shape }[] {
  if (!existsSync(APPS_DIR)) return [];
  return readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap(({ name }) => {
      const files: string[] = [];
      for (const root of SOURCE_ROOTS) collectTsx(join(APPS_DIR, name, root), files);
      const source = files.join("\n");
      if (NOT_A_DEMO.has(name)) return [];
      if (!source.includes(THEMEABLE_MARKER)) return [];
      if (source.includes(SCENARIO_MARKER)) {
        return [{ app: name, source, shape: "scenario" as Shape }];
      }
      if (source.includes(CHROME_MARKER)) {
        return [{ app: name, source, shape: "console" as Shape }];
      }
      return [];
    });
}

const APPS = themeableApps();

describe("scenario chrome contract", () => {
  it("finds scenario pages to check (guards against a silently empty suite)", () => {
    expect(APPS.length).toBeGreaterThan(3);
  });

  for (const rule of RULES) {
    describe(rule.name, () => {
      for (const { app, source, shape } of APPS.filter((a) =>
        rule.shapes.includes(a.shape),
      )) {
        const skip = rule.exempt?.has(app);
        it.skipIf(skip)(`${app} wires it`, () => {
          const found = [COMPOSED_HELPER, ...rule.needles].some((n) =>
            source.includes(n),
          );
          expect(found, `${app}: ${rule.why}`).toBe(true);
        });
      }
    });
  }
});
