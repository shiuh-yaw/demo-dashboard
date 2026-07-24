/**
 * Shared keyset pagination contract: cursor codec + Prisma page-args builder.
 * Pure functions only - no Prisma import, no IO. Ordering defaults to
 * (updatedAt desc, id desc) across every list method; cursor is an opaque
 * base64url encoding of the last-seen row id. No OFFSET anywhere.
 *
 * Models without `updatedAt` (e.g. `Team`) pass an explicit `orderKey` to
 * `pageArgs` (e.g. `"createdAt"`) - see `postgres/teams.ts`.
 */

import type { Page, PageOptions } from "../types";

/** Default page size when a caller omits `limit`. */
export const DEFAULT_PAGE_LIMIT = 50;

/** Hard ceiling on `limit`; never trust a client-supplied value above this. */
export const MAX_PAGE_LIMIT = 100;

/** Clamps to [1, MAX_PAGE_LIMIT]; falls back to DEFAULT_PAGE_LIMIT when omitted. */
export function clampLimit(n?: number): number {
  if (n === undefined) return DEFAULT_PAGE_LIMIT;
  return Math.min(Math.max(Math.trunc(n), 1), MAX_PAGE_LIMIT);
}

/** Encodes a row id into an opaque base64url cursor. */
export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

/** Decodes a cursor back to a row id; null for null/undefined/empty input. */
export function decodeCursor(c?: string | null): string | null {
  if (!c) return null;
  return Buffer.from(c, "base64url").toString("utf8");
}

/** Prisma findMany args shape for keyset paging by (orderKey desc, id desc). */
export interface PageArgs<K extends string = "updatedAt"> {
  take: number;
  orderBy: [Record<K, "desc">, { id: "desc" }];
  cursor?: { id: string };
  skip?: number;
}

/**
 * Builds Prisma findMany args; over-fetches one extra row as the next-page
 * probe. Orders by `(orderKey desc, id desc)`; `orderKey` defaults to
 * `"updatedAt"`. Pass an explicit `orderKey` for a model that lacks
 * `updatedAt` (e.g. `pageArgs(options, "createdAt")` for `Team`).
 */
export function pageArgs<K extends string = "updatedAt">(
  opts?: PageOptions,
  orderKey: K = "updatedAt" as K,
): PageArgs<K> {
  const take = clampLimit(opts?.limit) + 1;
  const args: PageArgs<K> = {
    take,
    orderBy: [{ [orderKey]: "desc" } as Record<K, "desc">, { id: "desc" }],
  };
  const id = decodeCursor(opts?.cursor);
  if (id !== null) {
    args.cursor = { id };
    args.skip = 1;
  }
  return args;
}

/** Splits an over-fetched row list into a Page, dropping the probe row. */
export function toPage<T extends { id: string }>(
  rows: T[],
  limit: number,
): Page<T> {
  if (rows.length > limit) {
    const items = rows.slice(0, limit);
    return { items, nextCursor: encodeCursor(items[items.length - 1]!.id) };
  }
  return { items: rows, nextCursor: null };
}
