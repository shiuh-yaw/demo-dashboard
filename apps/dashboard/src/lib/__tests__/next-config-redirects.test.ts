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
});
