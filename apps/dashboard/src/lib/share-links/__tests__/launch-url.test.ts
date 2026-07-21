import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildBrandedLaunchUrl,
  buildPlainLaunchUrl,
  demoThemeUrl,
  launchBaseUrl,
} from "@/lib/share-links/launch-url";
import { env } from "@/env";

vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_DEMO_URL_OVERRIDES: "{}" },
}));

const CATALOG_KINDS = [
  "earn",
  "wallet",
  "trade",
  "remittance",
  "checkout",
  "visa-direct",
] as const;

function setOverrides(value: string) {
  (env as { NEXT_PUBLIC_DEMO_URL_OVERRIDES: string }).NEXT_PUBLIC_DEMO_URL_OVERRIDES =
    value;
}

beforeEach(() => {
  setOverrides("{}");
});

describe("launchBaseUrl", () => {
  it("resolves catalog-backed kinds from the demo catalog", () => {
    for (const kind of CATALOG_KINDS) {
      expect(launchBaseUrl(kind)).toMatch(/^https:\/\//);
    }
  });

  it("prefers an override over the catalog URL", () => {
    setOverrides(
      JSON.stringify({
        wallet: "http://localhost:4003",
        checkout: "http://localhost:3000",
      }),
    );
    expect(launchBaseUrl("wallet")).toBe("http://localhost:4003");
    expect(launchBaseUrl("checkout")).toBe("http://localhost:3000");
  });

  it("ignores invalid override JSON and non-string values", () => {
    setOverrides("not-json");
    expect(launchBaseUrl("wallet")).toMatch(/^https:\/\//);
    setOverrides(JSON.stringify({ wallet: 42 }));
    expect(launchBaseUrl("wallet")).toMatch(/^https:\/\//);
  });
});

describe("buildBrandedLaunchUrl", () => {
  it("appends share + theme query params to the kind's base URL", () => {
    const base = launchBaseUrl("wallet")!;
    const url = buildBrandedLaunchUrl("wallet", "tok_123", "prospect_1");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      new URL(base).origin + new URL(base).pathname,
    );
    expect(parsed.searchParams.get("share")).toBe("tok_123");
    expect(parsed.searchParams.get("theme")).toBe("prospect_1");
  });

});

describe("buildPlainLaunchUrl", () => {
  it("returns the bare kind base URL with no query params", () => {
    const url = buildPlainLaunchUrl("remittance");
    expect(url).toBe(launchBaseUrl("remittance"));
    expect(url.includes("?")).toBe(false);
  });

});

describe("demoThemeUrl", () => {
  it("builds the operator '<baseUrl>/?theme=<id>' shape for catalog kinds", () => {
    for (const kind of CATALOG_KINDS) {
      expect(demoThemeUrl(kind, "config_1")).toBe(
        `${launchBaseUrl(kind)}/?theme=config_1`,
      );
    }
  });

  it("carries no share token", () => {
    const url = demoThemeUrl("wallet", "config_1");
    expect(new URL(url).searchParams.get("share")).toBeNull();
  });
});
