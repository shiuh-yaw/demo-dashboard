/**
 * Unit coverage for the org analytics demo filter. The parser must fail closed
 * (unknown/forged input -> "all", never an unexpected kind) and the narrowing
 * must only shrink the caller-resolved config set, never widen it.
 */

import { describe, expect, it } from "vitest";
import type { DemoConfigKind } from "@/lib/services/types";
import {
  ORG_DEMO_FILTER_ALL,
  availableKinds,
  narrowKindMap,
  parseOrgDemoFilter,
} from "../org-filter";

const map = (): Map<string, DemoConfigKind> =>
  new Map<string, DemoConfigKind>([
    ["c1", "wallet"],
    ["c2", "wallet"],
    ["c3", "earn"],
    ["c4", "checkout"],
  ]);

describe("parseOrgDemoFilter", () => {
  it("accepts every known demo kind", () => {
    for (const k of ["earn", "wallet", "trade", "visa-direct", "checkout", "remittance"]) {
      expect(parseOrgDemoFilter(k)).toBe(k);
    }
  });
  it("coerces unknown, empty, or nullish input to all (fail closed)", () => {
    expect(parseOrgDemoFilter("bogus")).toBe(ORG_DEMO_FILTER_ALL);
    expect(parseOrgDemoFilter("")).toBe(ORG_DEMO_FILTER_ALL);
    expect(parseOrgDemoFilter(null)).toBe(ORG_DEMO_FILTER_ALL);
    expect(parseOrgDemoFilter(undefined)).toBe(ORG_DEMO_FILTER_ALL);
    expect(parseOrgDemoFilter(ORG_DEMO_FILTER_ALL)).toBe(ORG_DEMO_FILTER_ALL);
  });
});

describe("narrowKindMap", () => {
  it("passes the full map through for all", () => {
    const { kindByConfigId, demoConfigIds } = narrowKindMap(map(), ORG_DEMO_FILTER_ALL);
    expect(kindByConfigId.size).toBe(4);
    expect(demoConfigIds.sort()).toEqual(["c1", "c2", "c3", "c4"]);
  });
  it("narrows to only the selected kind's configs", () => {
    const { kindByConfigId, demoConfigIds } = narrowKindMap(map(), "wallet");
    expect([...kindByConfigId.values()]).toEqual(["wallet", "wallet"]);
    expect(demoConfigIds.sort()).toEqual(["c1", "c2"]);
  });
  it("returns an empty set for a kind with no configs, never widening", () => {
    const { kindByConfigId, demoConfigIds } = narrowKindMap(map(), "remittance");
    expect(kindByConfigId.size).toBe(0);
    expect(demoConfigIds).toEqual([]);
  });
  it("does not mutate the input map", () => {
    const input = map();
    narrowKindMap(input, "earn");
    expect(input.size).toBe(4);
  });
});

describe("availableKinds", () => {
  it("returns the distinct kinds present in the map", () => {
    expect(availableKinds(map()).sort()).toEqual(["checkout", "earn", "wallet"]);
  });
  it("is empty for an empty map", () => {
    expect(availableKinds(new Map())).toEqual([]);
  });
});
