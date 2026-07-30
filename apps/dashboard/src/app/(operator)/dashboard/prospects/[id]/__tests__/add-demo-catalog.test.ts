import { describe, expect, it } from "vitest";
import { buildAddDemoCatalog } from "../add-demo-catalog";

describe("buildAddDemoCatalog", () => {
  it("lists every prospect-bindable kind and no others", () => {
    const rows = buildAddDemoCatalog({});
    const kinds = rows.map((r) => r.kind);
    expect(kinds).toContain("trade");
    expect(kinds).toContain("flow");
    expect(kinds).toContain("earn");
    expect(kinds).toContain("wallet");
    expect(kinds).toContain("remittance");
    expect(kinds).toContain("card");
    expect(kinds).toContain("visa-direct");
    // External-console kinds (checkout) never appear.
    expect(kinds).not.toContain("checkout");
    expect(rows.every((r) => Boolean(r.demoType))).toBe(true);
  });

  it("marks bindable kinds (incl. trade/flow) creatable when unbuilt", () => {
    const rows = buildAddDemoCatalog({});
    const trade = rows.find((r) => r.kind === "trade");
    const flow = rows.find((r) => r.kind === "flow");
    expect(trade?.status).toBe("creatable");
    expect(trade?.demoType).toBe("trade");
    expect(flow?.status).toBe("creatable");
    expect(flow?.demoType).toBe("flow");
  });

  it("marks a bindable kind creatable when the prospect has none yet", () => {
    const rows = buildAddDemoCatalog({});
    const earn = rows.find((r) => r.kind === "earn");
    expect(earn?.status).toBe("creatable");
    expect(earn?.demoType).toBe("earn");
    expect(earn?.demoConfigId).toBeUndefined();
  });

  it("marks a bindable kind added when the prospect already has one, carrying its id", () => {
    const rows = buildAddDemoCatalog({ wallet: "cfg_123" });
    const wallet = rows.find((r) => r.kind === "wallet");
    expect(wallet?.status).toBe("added");
    expect(wallet?.demoConfigId).toBe("cfg_123");
  });

  it("never marks an already-built kind as creatable (no duplicate-create path)", () => {
    const rows = buildAddDemoCatalog({
      earn: "e1",
      wallet: "w1",
      remittance: "r1",
      trade: "t1",
      flow: "f1",
      card: "c1",
      "visa-direct": "v1",
    });
    // The seven in-dashboard bindable kinds (checkout is external, excluded).
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.status === "added")).toBe(true);
  });
});
