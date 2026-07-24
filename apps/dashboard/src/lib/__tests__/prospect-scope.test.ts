import { describe, it, expect } from "vitest";
import {
  resolveProspectScope,
  defaultFilter,
  normalizeFilter,
  prospectScopeCacheKey,
} from "../prospect-scope";

const A = "team-a";
const members = new Set([A]);

describe("resolveProspectScope", () => {
  it("defaults to mine with no cookies and no team context", () => {
    expect(
      resolveProspectScope({
        ctx: undefined,
        filter: undefined,
        isAdmin: false,
        memberTeamIds: members,
      }),
    ).toEqual({ kind: "mine" });
  });

  it("defaults to team when a member team is the active context", () => {
    expect(
      resolveProspectScope({
        ctx: A,
        filter: undefined,
        isAdmin: false,
        memberTeamIds: members,
      }),
    ).toEqual({ kind: "team", teamId: A });
  });

  it("rejects team scope for a non-member (falls back to mine)", () => {
    expect(
      resolveProspectScope({
        ctx: "team-x",
        filter: "team",
        isAdmin: false,
        memberTeamIds: members,
      }),
    ).toEqual({ kind: "mine" });
  });

  it("allows an admin into any team context", () => {
    expect(
      resolveProspectScope({
        ctx: "team-x",
        filter: "team",
        isAdmin: true,
        memberTeamIds: new Set(),
      }),
    ).toEqual({ kind: "team", teamId: "team-x" });
  });

  it("rejects all scope for a non-admin", () => {
    expect(
      resolveProspectScope({
        ctx: "all",
        filter: "all",
        isAdmin: false,
        memberTeamIds: members,
      }),
    ).toEqual({ kind: "mine" });
  });

  it("allows all scope for an admin", () => {
    expect(
      resolveProspectScope({
        ctx: "all",
        filter: "all",
        isAdmin: true,
        memberTeamIds: new Set(),
      }),
    ).toEqual({ kind: "all" });
  });

  it("narrows mine to the active team when the filter is explicitly mine on a member team", () => {
    expect(
      resolveProspectScope({
        ctx: A,
        filter: "mine",
        isAdmin: false,
        memberTeamIds: members,
      }),
    ).toEqual({ kind: "mine", teamId: A });
  });

  it("narrows mine to the active team for an admin on any team context", () => {
    expect(
      resolveProspectScope({
        ctx: "team-x",
        filter: "mine",
        isAdmin: true,
        memberTeamIds: new Set(),
      }),
    ).toEqual({ kind: "mine", teamId: "team-x" });
  });

  it("does not narrow mine on a non-member team context", () => {
    expect(
      resolveProspectScope({
        ctx: "team-x",
        filter: "mine",
        isAdmin: false,
        memberTeamIds: members,
      }),
    ).toEqual({ kind: "mine" });
  });

  it("does not narrow mine on the personal context", () => {
    expect(
      resolveProspectScope({
        ctx: "personal",
        filter: "mine",
        isAdmin: false,
        memberTeamIds: members,
      }),
    ).toEqual({ kind: "mine" });
  });

  it("does not narrow mine on the all context", () => {
    expect(
      resolveProspectScope({
        ctx: "all",
        filter: "mine",
        isAdmin: true,
        memberTeamIds: new Set(),
      }),
    ).toEqual({ kind: "mine" });
  });
});

describe("defaultFilter / normalizeFilter", () => {
  it("defaults to team on a member team context", () => {
    expect(defaultFilter({ ctx: A, isAdmin: false, memberTeamIds: members })).toBe(
      "team",
    );
  });

  it("defaults to mine on personal context", () => {
    expect(
      defaultFilter({ ctx: "personal", isAdmin: false, memberTeamIds: members }),
    ).toBe("mine");
  });

  it("downgrades all to mine for non-admin", () => {
    expect(normalizeFilter("all", false, "mine")).toBe("mine");
    expect(normalizeFilter("all", true, "mine")).toBe("all");
  });
});

describe("prospectScopeCacheKey", () => {
  it("distinguishes all/mine/team, and mine-within-a-team from plain mine", () => {
    expect(prospectScopeCacheKey({ kind: "all" })).toBe("all");
    expect(prospectScopeCacheKey({ kind: "mine" })).toBe("mine");
    expect(prospectScopeCacheKey({ kind: "team", teamId: "team-a" })).toBe(
      "team:team-a",
    );
    expect(prospectScopeCacheKey({ kind: "mine", teamId: "team-a" })).toBe(
      "mine:team-a",
    );
  });

  it("gives a different key for different teams (so switching teams invalidates a client cache keyed on it)", () => {
    expect(prospectScopeCacheKey({ kind: "team", teamId: "team-a" })).not.toBe(
      prospectScopeCacheKey({ kind: "team", teamId: "team-b" }),
    );
  });
});
