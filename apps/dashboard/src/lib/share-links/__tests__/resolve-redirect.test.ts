import { describe, expect, it } from "vitest";

import { resolveShareRedirectUrl } from "@/lib/share-links/resolve-redirect";
import { launchBaseUrl } from "@/lib/share-links/launch-url";
import type {
  DemoConfigRecord,
  ShareLink,
  ShareLinkWithContext,
} from "@/lib/services/types";

function makeDemoConfig(
  overrides: Partial<DemoConfigRecord> = {},
): DemoConfigRecord {
  const ts = new Date();
  return {
    id: "dc_1",
    kind: "wallet",
    ownerId: "owner-1",
    createdById: null,
    name: "Test config",
    description: null,
    prospectId: null,
    isPrimary: false,
    themeOverrides: null,
    config: {},
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function makeShareLink(overrides: Partial<ShareLink> = {}): ShareLink {
  const ts = new Date();
  return {
    id: "sl_1",
    token: "tok_123",
    demoConfigId: "dc_1",
    prospectId: "prospect_1",
    userId: "user_1",
    status: "active",
    expiresAt: null,
    createdAt: ts,
    ...overrides,
  };
}

function buildDeps(options: {
  active?: ShareLinkWithContext | null;
  raw?: ShareLink | null;
  demoConfig?: DemoConfigRecord | null;
}) {
  return {
    shareLinks: {
      async resolveByToken() {
        return options.active ?? null;
      },
      async findByToken() {
        return options.raw ?? null;
      },
    },
    demoConfigs: {
      async get() {
        return options.demoConfig ?? null;
      },
    },
  };
}

describe("resolveShareRedirectUrl", () => {
  it("builds a branded + tracked URL for an active token bound to a prospect", async () => {
    const link = makeShareLink();
    const demoConfig = makeDemoConfig({ prospectId: "prospect_1" });
    const active: ShareLinkWithContext = {
      ...link,
      user: {
        id: "user_1",
        email: "se@fireblocks.com",
        dynamicUserId: null,
        displayName: null,
        avatarUrl: null,
        schedulingUrl: null,
        role: "MEMBER",
        deactivatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      prospect: {
        id: "prospect_1",
        ownerId: "owner-1",
        teamId: null,
        createdById: null,
        status: "ACTIVE",
        name: "Acme",
        description: null,
        companyUrl: null,
        logo: "dynamic",
        logoUrl: null,
        borderRadius: null,
        primaryColor: "#000",
        primaryHoverColor: null,
        secondaryColor: null,
        accentColor: null,
        pageBackground: null,
        background: null,
        foreground: null,
        mutedTextColor: null,
        borderColor: null,
        rowBackground: null,
        rowHoverBackground: null,
        gradientFrom: null,
        gradientTo: null,
        domain: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const url = await resolveShareRedirectUrl(
      "tok_123",
      buildDeps({ active, demoConfig }),
    );
    const parsed = new URL(url);
    // Bound config: theme = demoConfigId (its own bound prospect wins).
    expect(parsed.searchParams.get("theme")).toBe("dc_1");
    expect(parsed.searchParams.get("share")).toBe("tok_123");
    expect(url.startsWith(launchBaseUrl("wallet")!)).toBe(true);
  });

  it("uses the link's prospectId as theme for an unbound config", async () => {
    const link = makeShareLink();
    const demoConfig = makeDemoConfig({ prospectId: null });
    const active: ShareLinkWithContext = {
      ...link,
      user: {
        id: "user_1",
        email: "se@fireblocks.com",
        dynamicUserId: null,
        displayName: null,
        avatarUrl: null,
        schedulingUrl: null,
        role: "MEMBER",
        deactivatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      prospect: {
        id: "prospect_1",
        ownerId: "owner-1",
        teamId: null,
        createdById: null,
        status: "ACTIVE",
        name: "Acme",
        description: null,
        companyUrl: null,
        logo: "dynamic",
        logoUrl: null,
        borderRadius: null,
        primaryColor: "#000",
        primaryHoverColor: null,
        secondaryColor: null,
        accentColor: null,
        pageBackground: null,
        background: null,
        foreground: null,
        mutedTextColor: null,
        borderColor: null,
        rowBackground: null,
        rowHoverBackground: null,
        gradientFrom: null,
        gradientTo: null,
        domain: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const url = await resolveShareRedirectUrl(
      "tok_123",
      buildDeps({ active, demoConfig }),
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("theme")).toBe("prospect_1");
  });

  it("degrades a revoked/expired-but-identifiable token to the plain launch URL", async () => {
    const demoConfig = makeDemoConfig({ kind: "remittance" });
    const url = await resolveShareRedirectUrl(
      "tok_123",
      buildDeps({
        active: null,
        raw: makeShareLink({ status: "revoked" }),
        demoConfig,
      }),
    );
    expect(url).toBe(launchBaseUrl("remittance"));
    expect(url.includes("?")).toBe(false);
  });

  it("redirects to / when the token can't identify a demo at all", async () => {
    const url = await resolveShareRedirectUrl(
      "unknown-token",
      buildDeps({ active: null, raw: null }),
    );
    expect(url).toBe("/");
  });

  it("redirects to / when the identified demo config no longer exists", async () => {
    const url = await resolveShareRedirectUrl(
      "tok_123",
      buildDeps({ active: null, raw: makeShareLink(), demoConfig: null }),
    );
    expect(url).toBe("/");
  });

  it("never throws - falls back to / when a dependency rejects", async () => {
    const deps = {
      shareLinks: {
        async resolveByToken(): Promise<ShareLinkWithContext | null> {
          throw new Error("db down");
        },
        async findByToken(): Promise<ShareLink | null> {
          return null;
        },
      },
      demoConfigs: {
        async get(): Promise<DemoConfigRecord | null> {
          return null;
        },
      },
    };
    const url = await resolveShareRedirectUrl("tok_123", deps);
    expect(url).toBe("/");
  });
});
