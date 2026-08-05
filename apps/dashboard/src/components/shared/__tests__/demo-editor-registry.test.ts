import { describe, expect, it } from "vitest";

import {
  demoEditorRegistry,
  type StoredDemoConfig,
} from "@/components/shared/demo-editor-registry";
import {
  EXTERNAL_CONSOLE_HREF,
  DASHBOARD_EDITABLE_KINDS,
} from "@/components/shared/demo-editor-metadata";

describe("demoEditorRegistry", () => {
  it("covers every demo kind", () => {
    expect(Object.keys(demoEditorRegistry).sort()).toEqual(
      [
        "card",
        "checkout",
        "connections",
        "earn",
        "flow",
        "remittance",
        "trade",
        "visa-direct",
        "wallet",
      ].sort(),
    );
  });

  it("declares the per-kind AppearanceForm mode", () => {
    expect(demoEditorRegistry.wallet.appearanceMode).toBe("full");
    expect(demoEditorRegistry.earn.appearanceMode).toBe("simplified");
    expect(demoEditorRegistry.earn.hideLogo).toBe(true);
    expect(demoEditorRegistry.remittance.hideAccent).toBe(true);
    expect(demoEditorRegistry.trade.appearanceMode).toBe("none");
  });

  it("routes checkout to its own console and never treats flow as editable", () => {
    // checkout is edited in its own console; flow has no in-dashboard editor.
    expect(EXTERNAL_CONSOLE_HREF.checkout?.("abc")).toBe("/checkouts/abc");
    expect(EXTERNAL_CONSOLE_HREF.flow).toBeUndefined();
    expect(DASHBOARD_EDITABLE_KINDS.has("flow")).toBe(false);
    expect(DASHBOARD_EDITABLE_KINDS.has("checkout")).toBe(false);
    expect(DASHBOARD_EDITABLE_KINDS.has("wallet")).toBe(true);
  });

  it("hydrates wallet appearance from the stored theme", () => {
    const stored = {
      id: "w1",
      name: "My Wallet",
      config: { theme: { primaryColor: "#123456" }, branding: { logo: "x.svg" } },
    } as unknown as StoredDemoConfig;
    const appearance = demoEditorRegistry.wallet.initAppearance?.(stored);
    expect(appearance?.theme.primaryColor).toBe("#123456");
    expect(appearance?.branding.logo).toBe("x.svg");
  });

  it("hydrates earn kind state from stored branding", () => {
    const stored = {
      id: "e1",
      name: "My Earn",
      config: {
        branding: { logo: "youtube", tokenName: "PYUSD", appName: "Acme" },
        layout: { showSidebar: true },
      },
    } as unknown as StoredDemoConfig;
    const state = demoEditorRegistry.earn.initKindState?.(stored);
    expect(state?.logo).toBe("youtube");
    expect(state?.tokenName).toBe("PYUSD");
    expect(state?.appName).toBe("Acme");
    expect(state?.showSidebar).toBe(true);
  });
});
