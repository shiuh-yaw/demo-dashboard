import { describe, expect, it } from "vitest";
import {
  parseMemberEmails,
  withMemberEmail,
  type MemberEmails,
} from "../lib/business-accounts/member-emails";

describe("parseMemberEmails", () => {
  it("reads a stored directory", () => {
    expect(
      parseMemberEmails('{"acct-1":{"user-1":"a@example.com"}}'),
    ).toStrictEqual({ "acct-1": { "user-1": "a@example.com" } });
  });

  it("returns empty for absent, malformed, or wrongly-shaped storage", () => {
    // A display cache: a bad entry costs a uuid on screen, never a crash.
    expect(parseMemberEmails(null)).toStrictEqual({});
    expect(parseMemberEmails("not json")).toStrictEqual({});
    expect(parseMemberEmails("[]")).toStrictEqual({});
    expect(parseMemberEmails('"a string"')).toStrictEqual({});
    expect(parseMemberEmails('{"acct-1":"not an object"}')).toStrictEqual({});
  });

  it("drops non-string addresses but keeps the rest of the account", () => {
    expect(
      parseMemberEmails('{"acct-1":{"user-1":"a@example.com","user-2":42}}'),
    ).toStrictEqual({ "acct-1": { "user-1": "a@example.com" } });
  });
});

describe("withMemberEmail", () => {
  it("adds a pairing without mutating the input", () => {
    const before: MemberEmails = { "acct-1": { "user-1": "a@example.com" } };
    const after = withMemberEmail(before, "acct-1", "user-2", "b@example.com");

    expect(after).toStrictEqual({
      "acct-1": { "user-1": "a@example.com", "user-2": "b@example.com" },
    });
    expect(before).toStrictEqual({ "acct-1": { "user-1": "a@example.com" } });
  });

  it("scopes pairings per account", () => {
    const after = withMemberEmail(
      { "acct-1": { "user-1": "a@example.com" } },
      "acct-2",
      "user-1",
      "a@example.com",
    );
    expect(Object.keys(after)).toStrictEqual(["acct-1", "acct-2"]);
  });

  it("overwrites an address for the same user", () => {
    const after = withMemberEmail(
      { "acct-1": { "user-1": "old@example.com" } },
      "acct-1",
      "user-1",
      "new@example.com",
    );
    expect(after["acct-1"]!["user-1"]).toBe("new@example.com");
  });

  it("trims, and ignores an empty address or a missing id", () => {
    expect(
      withMemberEmail({}, "acct-1", "user-1", "  a@example.com  "),
    ).toStrictEqual({ "acct-1": { "user-1": "a@example.com" } });
    expect(withMemberEmail({}, "acct-1", "user-1", "   ")).toStrictEqual({});
    expect(withMemberEmail({}, "acct-1", "", "a@example.com")).toStrictEqual({});
  });

  it("evicts the least recently written account past the cap", () => {
    let directory: MemberEmails = {};
    for (let i = 0; i < 30; i += 1) {
      directory = withMemberEmail(
        directory,
        `acct-${i}`,
        "user-1",
        `a${i}@example.com`,
      );
    }

    const ids = Object.keys(directory);
    expect(ids).toHaveLength(25);
    expect(ids).not.toContain("acct-0");
    expect(ids).toContain("acct-29");
  });

  it("counts a re-touched account as recent", () => {
    let directory: MemberEmails = {};
    for (let i = 0; i < 25; i += 1) {
      directory = withMemberEmail(directory, `acct-${i}`, "u", "a@example.com");
    }
    // Touch the oldest, then push one more in - the touched one must survive.
    directory = withMemberEmail(directory, "acct-0", "u2", "b@example.com");
    directory = withMemberEmail(directory, "acct-new", "u", "c@example.com");

    expect(Object.keys(directory)).toContain("acct-0");
    expect(Object.keys(directory)).not.toContain("acct-1");
  });
});
