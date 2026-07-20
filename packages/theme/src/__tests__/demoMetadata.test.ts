import { describe, it, expect } from "vitest";
import { buildDemoMetadata } from "../demoMetadata";

describe("buildDemoMetadata", () => {
  it("unbranded: falls back to the Dynamic Demos title", () => {
    const meta = buildDemoMetadata({
      demoName: "Trade",
      description: "One app, every market.",
    });
    expect(meta.title).toBe("Trade - Dynamic Demos");
    expect(meta.description).toBe("One app, every market.");
  });

  it("branded: titles the tab as the prospect's app", () => {
    const meta = buildDemoMetadata({
      demoName: "Trade",
      description: "One app, every market.",
      appName: "SpaceX",
    });
    expect(meta.title).toBe("SpaceX - Trade");
  });

  it("treats null/empty appName as unbranded", () => {
    expect(
      buildDemoMetadata({ demoName: "Wallet", description: "d", appName: null })
        .title,
    ).toBe("Wallet - Dynamic Demos");
    expect(
      buildDemoMetadata({ demoName: "Wallet", description: "d", appName: "" })
        .title,
    ).toBe("Wallet - Dynamic Demos");
  });
});
