/**
 * Operators have `/brands` bookmarks and out-of-repo links; next.config.ts
 * declares permanent (308) redirects so those keep resolving. This test
 * asserts the redirect config shape directly rather than spinning up a
 * server, since `redirects()` is a plain async function on the exported Next
 * config object.
 */

import { describe, expect, it } from "vitest";

import nextConfig from "../../../next.config";

describe("next.config redirects", () => {
  it("redirects /brands and /brands/:path* permanently to /dashboard/prospects", async () => {
    const redirectsFn = nextConfig.redirects;
    expect(typeof redirectsFn).toBe("function");

    const redirects = await redirectsFn!();

    const exact = redirects.find((r) => r.source === "/brands");
    expect(exact).toMatchObject({
      source: "/brands",
      destination: "/dashboard",
      permanent: true,
    });

    const wildcard = redirects.find((r) => r.source === "/brands/:path*");
    expect(wildcard).toMatchObject({
      source: "/brands/:path*",
      destination: "/dashboard/prospects/:path*",
      permanent: true,
    });
  });

  it("redirects the retired prospect list to the Overview", async () => {
    const redirects = await nextConfig.redirects!();

    expect(
      redirects.find((r) => r.source === "/dashboard/prospects"),
    ).toMatchObject({ destination: "/dashboard", permanent: true });
  });

  it("leaves the prospect hub and the create page alone", async () => {
    const redirects = await nextConfig.redirects!();
    const sources = redirects.map((r) => r.source);

    // An over-broad source here would swallow every hub route, so the
    // absence of a wildcard is the actual assertion.
    expect(sources).not.toContain("/dashboard/prospects/:path*");
    expect(sources).not.toContain("/dashboard/prospects/:id");
  });
});
