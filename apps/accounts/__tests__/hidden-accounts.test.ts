import { describe, expect, it } from "vitest";
import { withHiddenAccount } from "../lib/business-accounts/hidden-accounts";

/**
 * Parsing and capping moved to `@dynamic-demos/dynamic` when hiding moved off
 * `localStorage` and onto Dynamic user metadata; they are covered there. What
 * stays here is the toggle, which is the only part this app decides.
 */
describe("withHiddenAccount", () => {
  it("adds an id", () => {
    expect(withHiddenAccount([], "a", true)).toStrictEqual(["a"]);
    expect(withHiddenAccount(["a"], "b", true)).toStrictEqual(["a", "b"]);
  });

  it("removes an id", () => {
    expect(withHiddenAccount(["a", "b"], "a", false)).toStrictEqual(["b"]);
  });

  it("never duplicates, so hiding twice is hiding once", () => {
    expect(withHiddenAccount(["a"], "a", true)).toStrictEqual(["a"]);
  });

  it("is a no-op when unhiding something that was not hidden", () => {
    expect(withHiddenAccount(["a"], "zzz", false)).toStrictEqual(["a"]);
  });

  it("does not mutate its input", () => {
    const before = ["a", "b"];
    withHiddenAccount(before, "c", true);
    expect(before).toStrictEqual(["a", "b"]);
  });
});
