import { describe, expect, it } from "vitest";
import { isBrandedSearch } from "../noindex";

describe("isBrandedSearch", () => {
  it("is true when only `share` is present", () => {
    expect(isBrandedSearch(new URLSearchParams("share=tok123"))).toBe(true);
  });

  it("is true when only `theme` is present", () => {
    expect(isBrandedSearch(new URLSearchParams("theme=cfg123"))).toBe(true);
  });

  it("is true when both `share` and `theme` are present", () => {
    expect(
      isBrandedSearch(new URLSearchParams("share=tok123&theme=cfg123")),
    ).toBe(true);
  });

  it("is false when neither param is present", () => {
    expect(isBrandedSearch(new URLSearchParams("foo=bar"))).toBe(false);
    expect(isBrandedSearch(new URLSearchParams(""))).toBe(false);
  });
});
