import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildOgFontSubsetText, renderDemoOgImage, type OgArtKey } from "../og-image";

describe("buildOgFontSubsetText", () => {
  it("includes the demo label and subtitle characters", () => {
    const text = buildOgFontSubsetText("Trade", "Live product demo");
    expect(text).toContain("T");
    expect(text).toContain("r");
    expect(text).toContain("L");
  });

  it("always includes the fixed wordmark and footer characters", () => {
    const text = buildOgFontSubsetText("X", "Y");
    for (const ch of "Dynamic demo.dynamic.xyz") {
      expect(text).toContain(ch);
    }
  });

  it("de-duplicates repeated characters", () => {
    const text = buildOgFontSubsetText("Trade", "Trade");
    // A Set-backed subset string can never be longer than the number of
    // distinct characters across every input it draws from.
    const distinctInput = new Set(
      `Dynamic Trade Trade demo.dynamic.xyz`,
    ).size;
    expect(text.length).toBe(distinctInput);
  });
});

describe("renderDemoOgImage", () => {
  it("returns a PNG image Response without throwing when the font fetch fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("network disabled in test"),
    );
    try {
      const res = await renderDemoOgImage({ demoLabel: "Test Demo" });
      expect(res).toBeInstanceOf(Response);
      expect(res.headers.get("content-type")).toBe("image/png");
      const buf = new Uint8Array(await res.arrayBuffer());
      // PNG magic bytes.
      expect(Array.from(buf.slice(0, 8))).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  // Rendering a PNG is seconds of blocking CPU each, and CI runners are
  // slower than laptops. Render every motif plus the artless baseline ONCE
  // here and assert against the cache: the per-motif checks below used to
  // render 24 images between them, which pushed the file past vitest's
  // 60s worker-RPC timeout and failed the run even though every test passed.
  const MOTIFS: OgArtKey[] = [
    "wallet", "connect", "accounts", "trade", "earn", "checkout", "transfer", "card",
  ];
  const painted = new Map<OgArtKey, Uint8Array>();
  let artless: Uint8Array;

  beforeAll(async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("network disabled in test"),
    );
    try {
      const render = async (art?: OgArtKey) => {
        const res = art
          ? await renderDemoOgImage({ demoLabel: "Demo", art })
          : await renderDemoOgImage({ demoLabel: "Demo" });
        return new Uint8Array(await res.arrayBuffer());
      };
      artless = await render();
      for (const art of MOTIFS) painted.set(art, await render(art));
    } finally {
      fetchSpy.mockRestore();
    }
  });

  // satori's failure mode for an unsupported SVG construct is a SILENT no-op
  // (a component element nested inside <svg> renders nothing at all), so
  // "it did not throw" proves nothing. Each motif must be shown to change
  // the rendered pixels versus the artless card.
  it.each<OgArtKey>(MOTIFS)("actually paints the %s motif", (art) => {
    expect(painted.get(art)).not.toEqual(artless);
  });

  it("renders a distinct image per motif", () => {
    const seen = new Set(
      MOTIFS.map((art) => Buffer.from(painted.get(art)!).toString("base64")),
    );
    expect(seen.size).toBe(MOTIFS.length);
  });

  it("never reads prospect/theme data - the label is the only variable input", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("network disabled in test"),
    );
    try {
      const a = await renderDemoOgImage({ demoLabel: "Wallet" });
      const b = await renderDemoOgImage({ demoLabel: "Wallet" });
      const [bufA, bufB] = await Promise.all([
        a.arrayBuffer(),
        b.arrayBuffer(),
      ]);
      expect(new Uint8Array(bufA)).toEqual(new Uint8Array(bufB));
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
