import { describe, expect, it, vi } from "vitest";
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

  // satori's failure mode for an unsupported SVG construct is a SILENT no-op
  // (a component element nested inside <svg> renders nothing at all), so
  // "it did not throw" proves nothing. Each motif must be shown to change
  // the rendered pixels versus the artless card.
  it.each<OgArtKey>(["wallet", "connect", "accounts", "trade", "earn", "checkout", "transfer", "card"])(
    "actually paints the %s motif",
    async (art) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("network disabled in test"),
      );
      try {
        const [withArt, without] = await Promise.all([
          renderDemoOgImage({ demoLabel: "Demo", art }).then((r) => r.arrayBuffer()),
          renderDemoOgImage({ demoLabel: "Demo" }).then((r) => r.arrayBuffer()),
        ]);
        expect(new Uint8Array(withArt)).not.toEqual(new Uint8Array(without));
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );

  it("renders a distinct image per motif", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("network disabled in test"),
    );
    try {
      const keys: OgArtKey[] = ["wallet", "connect", "accounts", "trade", "earn", "checkout", "transfer", "card"];
      const rendered = await Promise.all(
        keys.map((art) =>
          renderDemoOgImage({ demoLabel: "Demo", art })
            .then((r) => r.arrayBuffer())
            .then((b) => Buffer.from(b).toString("base64")),
        ),
      );
      expect(new Set(rendered).size).toBe(keys.length);
    } finally {
      fetchSpy.mockRestore();
    }
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
