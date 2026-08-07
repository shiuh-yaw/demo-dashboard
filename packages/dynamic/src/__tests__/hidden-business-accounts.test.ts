import { describe, expect, it } from "vitest";
import {
  getHiddenBusinessAccounts,
  MAX_HIDDEN_BUSINESS_ACCOUNTS,
  METADATA_KEYS,
} from "../metadata";

const key = METADATA_KEYS.HIDDEN_BUSINESS_ACCOUNTS;

function user(value: unknown) {
  return { metadata: { [key]: value } };
}

describe("getHiddenBusinessAccounts", () => {
  it("reads a stored list", () => {
    expect(getHiddenBusinessAccounts(user(["a", "b"]))).toStrictEqual([
      "a",
      "b",
    ]);
  });

  it("is empty when the key is absent, which is a new user", () => {
    expect(getHiddenBusinessAccounts({})).toStrictEqual([]);
    expect(getHiddenBusinessAccounts({ metadata: {} })).toStrictEqual([]);
  });

  it("is empty for anything that is not an array", () => {
    // Metadata is user-writable through the SDK, so its shape is an
    // assumption. A malformed value must not blank someone's account list.
    expect(getHiddenBusinessAccounts(user("a,b"))).toStrictEqual([]);
    expect(getHiddenBusinessAccounts(user({ a: 1 }))).toStrictEqual([]);
    expect(getHiddenBusinessAccounts(user(null))).toStrictEqual([]);
    expect(getHiddenBusinessAccounts(user(42))).toStrictEqual([]);
  });

  it("drops non-strings, blanks, and whitespace-only entries", () => {
    expect(
      getHiddenBusinessAccounts(user(["a", 42, "", null, "   ", "b"])),
    ).toStrictEqual(["a", "b"]);
  });

  it("trims and dedupes", () => {
    expect(
      getHiddenBusinessAccounts(user([" a ", "a", "b", "b"])),
    ).toStrictEqual(["a", "b"]);
  });

  it("caps, so this key cannot eat the 2KB metadata budget", () => {
    const many = Array.from(
      { length: MAX_HIDDEN_BUSINESS_ACCOUNTS + 25 },
      (_, i) => `id-${i}`,
    );
    expect(getHiddenBusinessAccounts(user(many))).toHaveLength(
      MAX_HIDDEN_BUSINESS_ACCOUNTS,
    );
  });
});
