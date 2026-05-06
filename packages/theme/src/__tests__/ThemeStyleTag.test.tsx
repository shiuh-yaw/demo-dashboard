/**
 * <ThemeStyleTag> renders a server-only <style> block that overrides the
 * defaults.css fallbacks. We assert on the rendered tree shape rather than
 * mounting in JSDOM so this stays a pure server-component snapshot.
 */

import { describe, expect, it } from "vitest";
import { ThemeStyleTag } from "../ThemeStyleTag";

describe("<ThemeStyleTag>", () => {
  it("renders a <style> element with the full --brand-* root block by default", () => {
    const node = ThemeStyleTag({ theme: { primary: "#ff00aa" } });
    expect(node.type).toBe("style");
    const css = (node.props as { dangerouslySetInnerHTML: { __html: string } })
      .dangerouslySetInnerHTML.__html;
    expect(css).toContain(":root {");
    expect(css).toContain("--brand-primary: #ff00aa;");
    expect(css).toContain("--brand-fg: #1d1d1f;"); // unspecified token defaults
    expect(css).toContain("}");
  });

  it("emits only overrides when overridesOnly=true", () => {
    const node = ThemeStyleTag({
      theme: { primary: "#ff00aa", radius: "20px" },
      overridesOnly: true,
    });
    const css = (node.props as { dangerouslySetInnerHTML: { __html: string } })
      .dangerouslySetInnerHTML.__html;
    expect(css).toContain("--brand-primary: #ff00aa;");
    expect(css).toContain("--brand-radius: 20px;");
    // Unset tokens should not appear.
    expect(css).not.toContain("--brand-fg:");
    expect(css).not.toContain("--brand-accent:");
  });

  it("renders without a theme prop (uses pure defaults)", () => {
    const node = ThemeStyleTag({});
    const css = (node.props as { dangerouslySetInnerHTML: { __html: string } })
      .dangerouslySetInnerHTML.__html;
    expect(css).toContain("--brand-primary: #0071e3;");
  });

  it("emits an empty :root when overridesOnly=true and no theme set", () => {
    const node = ThemeStyleTag({ overridesOnly: true });
    const css = (node.props as { dangerouslySetInnerHTML: { __html: string } })
      .dangerouslySetInnerHTML.__html;
    expect(css).toBe(":root {\n\n}");
  });
});
