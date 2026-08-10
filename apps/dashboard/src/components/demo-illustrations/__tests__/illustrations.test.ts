import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  OPERATOR_DEMO_ILLUSTRATIONS,
  getOperatorDemoIllustration,
  WalletIllustration,
} from "../illustrations";

// The operator surface must never bake in an accent of its own: the drawings
// are shared with the public landing and the OG unfurl, and only the palette
// differs. Colors arrive as `var(--di-*)` custom properties scoped to
// [data-surface="operator"] in globals.css (previously fill/stroke classes -
// the shared drawings use inline `style` so the same markup also renders
// under satori, which has no stylesheet and cannot resolve classes).
describe("operator demo illustrations", () => {
  for (const [slug, Illustration] of Object.entries(OPERATOR_DEMO_ILLUSTRATIONS)) {
    it(`renders ${slug} from the operator custom-property palette`, () => {
      const html = renderToStaticMarkup(createElement(Illustration));
      expect(html).toContain("<svg");
      expect(html).toContain("var(--di-accent)");
      // No hardcoded accent may leak into the operator surface.
      expect(html).not.toContain("#4779");
      expect(html).not.toContain("#5b8bff");
    });

    it(`namespaces ${slug} gradient ids to the operator surface`, () => {
      const html = renderToStaticMarkup(createElement(Illustration));
      const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
      const refs = [...html.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);

      // Assert the gradients EXIST before asserting anything about them - a
      // bare `for (const id of matchAll(...))` passes vacuously when the defs
      // fail to render at all, which is the failure actually worth catching:
      // a fill pointing at a missing id paints black, not the accent.
      expect(ids.length).toBeGreaterThan(0);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        expect(ids, `${slug}: fill references #${ref} with no matching def`).toContain(ref);
      }
      // Public and operator artwork can coexist on one page; SVG ids are
      // global, so an un-prefixed id would let one palette win for both.
      for (const id of ids) {
        expect(id).toMatch(/^op-ill-/);
      }
    });
  }

  it("falls back to Wallet for unknown slugs", () => {
    expect(getOperatorDemoIllustration("nope")).toBe(WalletIllustration);
  });
});
