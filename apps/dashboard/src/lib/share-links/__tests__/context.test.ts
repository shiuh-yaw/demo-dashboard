import { describe, expect, it } from "vitest";

import { resolveShareContext } from "@/lib/share-links/context";
import type { GtmUser, Prospect, ShareLinkWithContext } from "@/lib/services/types";

function makeUser(overrides: Partial<GtmUser> = {}): GtmUser {
  const ts = new Date();
  return {
    id: "user_1",
    email: "se@fireblocks.com",
    dynamicUserId: null,
    displayName: null,
    avatarUrl: null,
    schedulingUrl: null,
    role: "MEMBER",
    deactivatedAt: null,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  const ts = new Date();
  return {
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
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function makeLink(
  user: GtmUser,
  prospect: Prospect,
): ShareLinkWithContext {
  const ts = new Date();
  return {
    id: "sl_1",
    token: "tok_123",
    demoConfigId: "dc_1",
    prospectId: prospect.id,
    userId: user.id,
    status: "active",
    expiresAt: null,
    createdAt: ts,
    user,
    prospect,
  };
}

function buildDeps(link: ShareLinkWithContext | null) {
  return {
    shareLinks: {
      async resolveByToken() {
        return link;
      },
    },
  };
}

describe("resolveShareContext", () => {
  it("returns {} for an invalid/inactive token", async () => {
    const result = await resolveShareContext("unknown", buildDeps(null));
    expect(result).toEqual({});
  });

  it("falls back to the org default cta when the SE has no schedulingUrl", async () => {
    const link = makeLink(makeUser({ schedulingUrl: null }), makeProspect());
    const result = await resolveShareContext("tok_123", buildDeps(link));
    expect(result.prospectName).toBe("Acme");
    expect(result.cta).toEqual({
      label: "Book a call",
      url: "https://www.dynamic.xyz/book-a-call",
    });
  });

  it("returns a labeled cta with the SE's display name when set", async () => {
    const link = makeLink(
      makeUser({
        schedulingUrl: "https://cal.com/jane",
        displayName: "Jane Doe",
      }),
      makeProspect(),
    );
    const result = await resolveShareContext("tok_123", buildDeps(link));
    expect(result.cta).toEqual({
      label: "Book a call with Jane Doe",
      url: "https://cal.com/jane",
    });
  });

  it("falls back to a plain label when the SE has no display name", async () => {
    const link = makeLink(
      makeUser({ schedulingUrl: "https://cal.com/jane", displayName: null }),
      makeProspect(),
    );
    const result = await resolveShareContext("tok_123", buildDeps(link));
    expect(result.cta?.label).toBe("Book a call");
  });

  it("falls back to the org default if schedulingUrl is not https (defense in depth)", async () => {
    const link = makeLink(
      makeUser({ schedulingUrl: "http://cal.com/jane" }),
      makeProspect(),
    );
    const result = await resolveShareContext("tok_123", buildDeps(link));
    expect(result.cta).toEqual({
      label: "Book a call",
      url: "https://www.dynamic.xyz/book-a-call",
    });
  });

  it("never leaks email, ids, or theme fields", async () => {
    const link = makeLink(
      makeUser({ schedulingUrl: "https://cal.com/jane", displayName: "Jane" }),
      makeProspect(),
    );
    const result = await resolveShareContext("tok_123", buildDeps(link));
    const keys = Object.keys(result);
    expect(keys.sort()).toEqual(["cta", "prospectName"]);
  });

  it("never throws - returns {} when the dependency rejects", async () => {
    const deps = {
      shareLinks: {
        async resolveByToken(): Promise<ShareLinkWithContext | null> {
          throw new Error("db down");
        },
      },
    };
    const result = await resolveShareContext("tok_123", deps);
    expect(result).toEqual({});
  });
});
