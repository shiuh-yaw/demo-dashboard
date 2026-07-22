import { describe, expect, it } from "vitest";
import { isNavItemActive } from "../lib/nav-items";

describe("isNavItemActive", () => {
  it("matches /overview exactly", () => {
    expect(isNavItemActive("/overview", "/overview")).toBe(true);
  });

  it("matches by prefix for non-exact-match hrefs", () => {
    expect(isNavItemActive("/history/xyz", "/history")).toBe(true);
  });

  it("does not match /overview when pathname is a different section", () => {
    expect(isNavItemActive("/history", "/overview")).toBe(false);
  });
});
