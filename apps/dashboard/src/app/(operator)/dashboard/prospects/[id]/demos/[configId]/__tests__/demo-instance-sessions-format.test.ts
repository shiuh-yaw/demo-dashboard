import { describe, expect, it } from "vitest";
import {
  formatMilestoneChip,
  groupSessionsByViewer,
  sessionCompanyLabel,
} from "../demo-instance-sessions-format";
import type { VisitorSessionView } from "@/lib/services";

function session(
  overrides: Partial<VisitorSessionView> = {},
): VisitorSessionView {
  return {
    id: "s1",
    demoConfigId: "cfg1",
    demoSlug: "wallet",
    anonId: "a1",
    startedAt: "2026-07-04T12:00:00.000Z",
    lastSeenAt: "2026-07-04T12:05:00.000Z",
    company: null,
    email: null,
    dynamicUserId: null,
    milestones: [],
    identifiedUserId: null,
    identifiedEmail: null,
    ...overrides,
  };
}

describe("sessionCompanyLabel", () => {
  it("prefers the company name over the domain", () => {
    expect(
      sessionCompanyLabel(
        session({ company: { name: "Acme Inc", domain: "acme.com" } }),
      ),
    ).toBe("Acme Inc");
  });

  it("falls back to the domain when no name is captured", () => {
    expect(
      sessionCompanyLabel(session({ company: { name: null, domain: "acme.com" } })),
    ).toBe("acme.com");
  });

  it("falls back to Unknown company when neither is captured", () => {
    expect(sessionCompanyLabel(session({ company: null }))).toBe(
      "Unknown company",
    );
  });
});

describe("formatMilestoneChip", () => {
  it("title-cases a single-word milestone", () => {
    expect(formatMilestoneChip("viewed")).toBe("Viewed");
  });

  it("splits on hyphens and underscores, title-casing each word", () => {
    expect(formatMilestoneChip("wallet_connected")).toBe("Wallet Connected");
    expect(formatMilestoneChip("share-link-opened")).toBe("Share Link Opened");
  });
});

describe("groupSessionsByViewer", () => {
  it("groups multiple sessions from the same identified viewer under one key", () => {
    const groups = groupSessionsByViewer([
      session({ id: "s1", email: "a@acme.com", anonId: "anon1" }),
      session({ id: "s2", email: "a@acme.com", anonId: "anon2" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("a@acme.com");
    expect(groups[0].sessionCount).toBe(2);
    expect(groups[0].sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("falls back to anonId as the key when no email is captured", () => {
    const groups = groupSessionsByViewer([
      session({ id: "s1", email: null, anonId: "anon1" }),
      session({ id: "s2", email: null, anonId: "anon2" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.key).sort()).toEqual(["anon1", "anon2"]);
  });

  it("keeps distinct emails and distinct anon viewers as separate groups", () => {
    const groups = groupSessionsByViewer([
      session({ id: "s1", email: "a@acme.com", anonId: "anon1" }),
      session({ id: "s2", email: "b@acme.com", anonId: "anon2" }),
      session({ id: "s3", email: null, anonId: "anon3" }),
    ]);
    expect(groups).toHaveLength(3);
  });

  it("sorts each viewer's sessions newest (by lastSeenAt) first", () => {
    const groups = groupSessionsByViewer([
      session({
        id: "older",
        email: "a@acme.com",
        anonId: "anon1",
        lastSeenAt: "2026-07-01T12:00:00.000Z",
      }),
      session({
        id: "newer",
        email: "a@acme.com",
        anonId: "anon1",
        lastSeenAt: "2026-07-05T12:00:00.000Z",
      }),
    ]);
    expect(groups[0].sessions.map((s) => s.id)).toEqual(["newer", "older"]);
    expect(groups[0].lastSeenAt).toBe("2026-07-05T12:00:00.000Z");
  });

  it("orders groups newest-viewer-first by last activity", () => {
    const groups = groupSessionsByViewer([
      session({
        id: "s1",
        email: "old@acme.com",
        anonId: "anon1",
        lastSeenAt: "2026-07-01T12:00:00.000Z",
      }),
      session({
        id: "s2",
        email: "new@acme.com",
        anonId: "anon2",
        lastSeenAt: "2026-07-10T12:00:00.000Z",
      }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["new@acme.com", "old@acme.com"]);
  });

  it("takes the company from the most recent session that captured one", () => {
    const groups = groupSessionsByViewer([
      session({
        id: "s1",
        email: "a@acme.com",
        anonId: "anon1",
        lastSeenAt: "2026-07-01T12:00:00.000Z",
        company: { name: "Acme Inc", domain: "acme.com" },
      }),
      session({
        id: "s2",
        email: "a@acme.com",
        anonId: "anon1",
        lastSeenAt: "2026-07-05T12:00:00.000Z",
        company: null,
      }),
    ]);
    expect(groups[0].company).toEqual({ name: "Acme Inc", domain: "acme.com" });
  });

  it("returns an empty array for no sessions", () => {
    expect(groupSessionsByViewer([])).toEqual([]);
  });
});
