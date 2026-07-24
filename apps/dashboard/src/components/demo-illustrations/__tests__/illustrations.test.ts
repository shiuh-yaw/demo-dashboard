import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  OPERATOR_DEMO_ILLUSTRATIONS,
  getOperatorDemoIllustration,
  WalletIllustration,
} from "../illustrations";

// Each operator illustration must render an <svg> whose accent comes from the
// class-based palette (.di-accent / .di-accent-stroke / .di-accent-stop),
// recolored per operator surface in globals.css, never a hardcoded hex accent.
describe("operator demo illustrations", () => {
  for (const [slug, Illustration] of Object.entries(OPERATOR_DEMO_ILLUSTRATIONS)) {
    it(`renders ${slug} with a class-driven accent`, () => {
      const html = renderToStaticMarkup(createElement(Illustration));
      expect(html).toContain("<svg");
      expect(html).toMatch(/di-accent(-stroke|-stop)?/);
      expect(html).not.toContain("var(--di-accent)");
      expect(html).not.toContain("#4779");
    });
  }

  it("falls back to Wallet for unknown slugs", () => {
    expect(getOperatorDemoIllustration("nope")).toBe(WalletIllustration);
  });
});
