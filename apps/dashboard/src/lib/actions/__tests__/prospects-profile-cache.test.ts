/**
 * Perf regression guard (GTM-07 IA relayout): `getProspectProfile` must
 * resolve a prospect's full profile (auth + visibility + owner/demos resolve)
 * exactly once per request, no matter how many hub segments call it. The
 * installed "react" build no-ops `cache()` outside a real Server Component
 * render, so a plain call-count assertion under Vitest wouldn't exercise any
 * memoization at all - this test substitutes a real per-argument memoizing
 * `cache()` (keyed on the exact arguments a caller passed, same contract as
 * React's own per-request memoization) to prove the wiring collapses
 * `getSessionUser`, `visibleProspectIds`, and the prospect-row read to one
 * underlying call across repeated `getProspectProfile(id)` calls for the
 * same id - simulating the hub layout plus every segment page under it.
 *
 * `vi.resetModules()` + a dynamic re-import per test gives each test its own
 * fresh `cache()`-backed module instance (a fresh memoization store), the
 * same way a real request gets a fresh cache - without this, the module-level
 * cache from one test would leak into the next.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GtmUser, Prospect } from "@/lib/services";

// Stubbed so importing `@/lib/actions/prospects` (and transitively `@/env`)
// doesn't run real env validation in a unit test. The sign-in domain allowlist
// is no longer read from here - it's `ALLOWED_EMAIL_DOMAINS` in lib/auth/gtm.
vi.mock("@/env", () => ({ env: {} }));

// Real per-argument memoizing `cache()` (the installed "react" build no-ops
// `cache()` outside a Server Component render) - proves the memoization
// contract this task relies on, not just that the plain functions work.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache<F extends (...args: never[]) => unknown>(fn: F): F {
      const store = new Map<string, ReturnType<F>>();
      return ((...args: Parameters<F>) => {
        const key = JSON.stringify(args);
        if (!store.has(key)) store.set(key, fn(...args) as ReturnType<F>);
        return store.get(key);
      }) as F;
    },
  };
});

const { getCurrentUser, prospectService, teamsService, usersService } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prospectService: { get: vi.fn(), listIds: vi.fn() },
  teamsService: { membershipsForUser: vi.fn(), list: vi.fn() },
  usersService: {
    getOrCreateByEmail: vi.fn(),
    update: vi.fn(),
    claimLegacyRecords: vi.fn(),
    resolveByDynamicIds: vi.fn().mockResolvedValue(new Map()),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/services", () => ({
  prospectService,
  services: {
    prospects: prospectService,
    teams: teamsService,
    users: usersService,
    demoConfigs: { listIdKinds: vi.fn().mockResolvedValue([]) },
  },
}));

const SESSION = { sub: "sub-1", email: "alice@fireblocks.com" };

const MEMBER_USER: GtmUser = {
  id: "u1",
  email: "alice@fireblocks.com",
  dynamicUserId: "sub-1",
  displayName: null,
  avatarUrl: null,
  schedulingUrl: null,
  role: "MEMBER",
  deactivatedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function mkProspect(over: Partial<Prospect>): Prospect {
  return {
    id: "p1",
    ownerId: "sub-1",
    teamId: "team-1",
    createdById: "u1",
    status: "ACTIVE",
    name: "Acme",
    description: null,
    companyUrl: null,
    logo: "dynamic",
    logoUrl: null,
    borderRadius: null,
    primaryColor: "#000",
    primaryHoverColor: null,
    secondaryColor: null,
    accentColor: null,
    pageBackground: null,
    background: null,
    foreground: null,
    mutedTextColor: null,
    borderColor: null,
    rowBackground: null,
    rowHoverBackground: null,
    gradientFrom: null,
    gradientTo: null,
    domain: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...over,
  };
}

/** Fresh module graph per test - a fresh `cache()` memoization store, i.e. a new "request". */
async function freshGetProspectProfile() {
  vi.resetModules();
  const mod = await import("@/lib/actions/prospects");
  return mod.getProspectProfile;
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(SESSION);
  usersService.getOrCreateByEmail.mockResolvedValue(MEMBER_USER);
  // Team-visible (not owned) so authorization exercises the memoized
  // membership read - the in-memory own-check would otherwise short-circuit.
  prospectService.get.mockResolvedValue(mkProspect({ createdById: "u2" }));
  teamsService.membershipsForUser.mockResolvedValue([
    { id: "m1", userId: "u1", teamId: "team-1", role: "MEMBER", createdAt: new Date() },
  ]);
  prospectService.listIds.mockResolvedValue(["p1"]);
});

describe("getProspectProfile - per-request memoization", () => {
  it("resolves once across repeated calls for the same id (layout + every segment page)", async () => {
    const getProspectProfile = await freshGetProspectProfile();

    const [layout, overview, demos, contacts, settings] = await Promise.all([
      getProspectProfile("p1"),
      getProspectProfile("p1"),
      getProspectProfile("p1"),
      getProspectProfile("p1"),
      getProspectProfile("p1"),
    ]);

    for (const res of [layout, overview, demos, contacts, settings]) {
      expect(res.success).toBe(true);
    }
    expect(overview).toEqual(layout);
    expect(demos).toEqual(layout);
    expect(contacts).toEqual(layout);
    expect(settings).toEqual(layout);

    // The expensive per-request chain - session resolve, visibility query,
    // and the prospect-row read - each ran exactly once, not once per caller.
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(prospectService.get).toHaveBeenCalledTimes(1);
    expect(teamsService.membershipsForUser).toHaveBeenCalledTimes(1);
  });

  it("a fresh request (fresh module graph) re-runs the resolution instead of reusing a prior request's cache", async () => {
    const firstRequest = await freshGetProspectProfile();
    await firstRequest("p1");
    expect(prospectService.get).toHaveBeenCalledTimes(1);

    const secondRequest = await freshGetProspectProfile();
    await secondRequest("p1");
    await secondRequest("p1");

    // A new request re-resolves once (fresh cache) - and still collapses its
    // own repeated in-request calls to one, matching the first assertion.
    expect(prospectService.get).toHaveBeenCalledTimes(2);
  });
});
