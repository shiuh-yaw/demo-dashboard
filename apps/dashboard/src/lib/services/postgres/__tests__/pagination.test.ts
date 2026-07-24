/**
 * Shared pagination contract: cursor codec + keyset page-args builder.
 * Pure functions - no Prisma client, no IO.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  clampLimit,
  decodeCursor,
  encodeCursor,
  pageArgs,
  toPage,
} from "../pagination";

describe("clampLimit", () => {
  it("defaults to DEFAULT_PAGE_LIMIT when omitted", () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_PAGE_LIMIT);
  });

  it("clamps values above MAX_PAGE_LIMIT down to MAX_PAGE_LIMIT", () => {
    expect(clampLimit(1000)).toBe(MAX_PAGE_LIMIT);
  });

  it("clamps values below 1 up to 1", () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-5)).toBe(1);
  });

  it("passes through an in-range value unchanged", () => {
    expect(clampLimit(25)).toBe(25);
  });
});

describe("encodeCursor / decodeCursor", () => {
  it("round-trips an id through base64url", () => {
    const id = "clx-some-cuid-123";
    expect(decodeCursor(encodeCursor(id))).toBe(id);
  });

  it("decodeCursor returns null for null, undefined, and empty string", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });
});

describe("pageArgs", () => {
  it("take is clampLimit(limit) + 1, the probe row", () => {
    expect(pageArgs({ limit: 10 }).take).toBe(11);
  });

  it("orders by updatedAt desc then id desc", () => {
    expect(pageArgs().orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });

  it("omits cursor/skip when no cursor is given", () => {
    const args = pageArgs({ limit: 10 });
    expect(args.cursor).toBeUndefined();
    expect(args.skip).toBeUndefined();
  });

  it("sets cursor + skip:1 when a cursor decodes to an id", () => {
    const cursor = encodeCursor("row-42");
    const args = pageArgs({ limit: 10, cursor });
    expect(args.cursor).toEqual({ id: "row-42" });
    expect(args.skip).toBe(1);
  });

  it("uses the default limit when opts is omitted entirely", () => {
    expect(pageArgs().take).toBe(DEFAULT_PAGE_LIMIT + 1);
  });

  it("orders by an explicit orderKey desc then id desc, for a model without updatedAt (e.g. Team)", () => {
    expect(pageArgs(undefined, "createdAt").orderBy).toEqual([
      { createdAt: "desc" },
      { id: "desc" },
    ]);
  });
});

describe("toPage", () => {
  it("drops the probe row and sets nextCursor to the last kept row's id when over-fetched", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const page = toPage(rows, 2);
    expect(page.items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(page.nextCursor).toBe(encodeCursor("b"));
  });

  it("returns nextCursor null when rows.length <= limit", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const page = toPage(rows, 2);
    expect(page.items).toEqual(rows);
    expect(page.nextCursor).toBeNull();
  });

  it("returns nextCursor null for an empty result", () => {
    const page = toPage([], 2);
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});
