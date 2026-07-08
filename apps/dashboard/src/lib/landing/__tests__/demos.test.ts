import { describe, expect, it } from "vitest";
import {
  LANDING_DEMOS,
  getDemoBySlug,
  type LandingDemo,
} from "@/lib/landing/demos";
import { DEMO_ILLUSTRATIONS } from "@/app/(public)/_components/illustrations";

describe("LANDING_DEMOS config", () => {
  it("contains exactly the six landing demos", () => {
    const slugs = LANDING_DEMOS.map((d) => d.slug).sort();
    expect(slugs).toEqual([
      "earn",
      "flow",
      "proceeds",
      "remittance",
      "trade",
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

  it("has a dedicated illustration for every demo", () => {
    for (const demo of LANDING_DEMOS) {
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
