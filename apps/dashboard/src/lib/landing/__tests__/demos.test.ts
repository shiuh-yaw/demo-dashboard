import { describe, expect, it } from "vitest";
import {
  LANDING_DEMOS,
  getDemoBySlug,
  PLAYGROUND_SLUG,
  type LandingDemo,
} from "@/lib/landing/demos";
import { DEMO_ILLUSTRATIONS } from "@/app/(public)/_components/illustrations";
import { DEMO_CATALOG, DEMO_DIRECTORY } from "@dynamic-demos/ui";

describe("LANDING_DEMOS config", () => {
  it("contains exactly the catalog demos", () => {
    const slugs = LANDING_DEMOS.map((d) => d.slug).sort();
    expect(slugs).toEqual([
      "accounts",
      "checkouts",
      "connections",
      "earn",
      "flow",
      "playground",
      "remittance",
      "rimau",
      "stablecoin-card",
      "trade",
      "visa-direct",
      "wallet",
    ]);
  });

  it("has unique slugs", () => {
    const slugs = LANDING_DEMOS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has non-empty copy on every demo", () => {
    for (const demo of LANDING_DEMOS) {
      expect(demo.name.trim().length, demo.slug).toBeGreaterThan(0);
      expect(demo.tagline.trim().length, demo.slug).toBeGreaterThan(0);
      expect(demo.description.trim().length, demo.slug).toBeGreaterThan(0);
      expect(demo.highlights.length, demo.slug).toBeGreaterThanOrEqual(3);
      for (const h of demo.highlights) {
        expect(h.trim().length, demo.slug).toBeGreaterThan(0);
      }
    }
  });

  it("never spells onchain with a hyphen", () => {
    for (const demo of LANDING_DEMOS) {
      const text = [
        demo.tagline,
        demo.description,
        ...demo.highlights,
        ...demo.stack,
        ...demo.resources.map((r) => r.label),
      ]
        .join(" ")
        .toLowerCase();
      expect(text, demo.slug).not.toContain("on-chain");
    }
  });

  it("has stack chips on every demo and well-formed resource links when present", () => {
    for (const demo of LANDING_DEMOS) {
      expect(demo.stack.length, demo.slug).toBeGreaterThanOrEqual(3);
      for (const item of demo.stack) {
        expect(item.trim().length, demo.slug).toBeGreaterThan(0);
      }
      for (const resource of demo.resources) {
        expect(resource.label.trim().length, demo.slug).toBeGreaterThan(0);
        const parsed = new URL(resource.url);
        expect(parsed.protocol, `${demo.slug}: ${resource.label}`).toBe(
          "https:",
        );
      }
    }
  });

  it("uses well-formed https URLs when url is set", () => {
    for (const demo of LANDING_DEMOS) {
      if (demo.url !== undefined) {
        const parsed = new URL(demo.url);
        expect(parsed.protocol, demo.slug).toBe("https:");
      }
    }
  });

  it("has a dedicated illustration for every card demo", () => {
    for (const demo of LANDING_DEMOS) {
      // Playground is banner-only (no card, no detail page), so no illustration.
      if (demo.slug === PLAYGROUND_SLUG) continue;
      expect(DEMO_ILLUSTRATIONS[demo.slug], demo.slug).toBeDefined();
    }
  });

  it("uses only known categories", () => {
    const valid: LandingDemo["category"][] = ["wallet", "checkout", "offramp"];
    for (const demo of LANDING_DEMOS) {
      expect(valid, demo.slug).toContain(demo.category);
    }
  });
});

describe("getDemoBySlug", () => {
  it("returns the demo for a known slug", () => {
    expect(getDemoBySlug("wallet")?.name).toBe("Wallet");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getDemoBySlug("nope")).toBeUndefined();
  });
});

describe("showOnLanding", () => {
  it("is declared explicitly on every catalog entry", () => {
    for (const demo of LANDING_DEMOS) {
      expect(typeof demo.showOnLanding).toBe("boolean");
    }
  });

  it("hides non-landing demos from slug resolution", () => {
    const hidden = LANDING_DEMOS.find((demo) => !demo.showOnLanding);
    if (hidden) {
      expect(getDemoBySlug(hidden.slug)).toBeUndefined();
    }
  });
});

// The landing cards, the detail pages and every demo app's SiteHeader nav grid
// must show one wording per demo. These used to be three hand-maintained
// copies and drifted (four taglines diverged, two demos vanished from the
// nav), so the shared DEMO_CATALOG is now the only place the words live and
// the others derive from it. These tests fail if anyone reintroduces a copy.
describe("demo copy has a single source", () => {
  it("LANDING_DEMOS takes its public copy from DEMO_CATALOG verbatim", () => {
    for (const demo of LANDING_DEMOS) {
      const canonical = DEMO_CATALOG.find((c) => c.slug === demo.slug);
      expect(canonical, `no catalog entry for ${demo.slug}`).toBeDefined();
      expect({
        name: demo.name,
        tagline: demo.tagline,
        url: demo.url,
        showOnLanding: demo.showOnLanding,
      }).toEqual({
        name: canonical!.name,
        tagline: canonical!.tagline,
        url: canonical!.url,
        showOnLanding: canonical!.showOnLanding,
      });
    }
  });

  it("the nav grid matches the catalog word for word", () => {
    for (const entry of DEMO_DIRECTORY) {
      const canonical = DEMO_CATALOG.find((c) => c.name === entry.name);
      expect(canonical, `nav entry "${entry.name}" is not in the catalog`).toBeDefined();
      expect(entry.tagline).toBe(canonical!.tagline);
      expect(entry.href).toBe(canonical!.url);
    }
  });

  it("lists every public, deployed demo in the nav grid", () => {
    const expected = DEMO_CATALOG.filter(
      (c) => c.showOnLanding && c.url && c.showInNav !== false,
    )
      .map((c) => c.name)
      .sort();
    expect(DEMO_DIRECTORY.map((d) => d.name).sort()).toEqual(expected);
  });

  it("keeps banner-only demos out of the nav grid", () => {
    const bannerOnly = DEMO_CATALOG.filter((c) => c.showInNav === false).map(
      (c) => c.name,
    );
    expect(bannerOnly.length).toBeGreaterThan(0);
    for (const name of bannerOnly) {
      expect(DEMO_DIRECTORY.map((d) => d.name)).not.toContain(name);
    }
  });

  it("keeps unlisted demos out of the nav grid", () => {
    const hidden = DEMO_CATALOG.filter((c) => !c.showOnLanding).map((c) => c.name);
    expect(hidden.length).toBeGreaterThan(0);
    for (const name of hidden) {
      expect(DEMO_DIRECTORY.map((d) => d.name)).not.toContain(name);
    }
  });
});
