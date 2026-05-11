import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Back-compat for legacy path-based config URLs (`/r/[id]/...`). Maps the
  // bookmarked URL to the new query-based contract:
  //   /r/abc           → /?theme=abc
  //   /r/abc/dashboard → /?theme=abc
  //   /r/abc/login     → /login?theme=abc
  //   /r/abc/admin     → /admin?theme=abc
  //   /r/abc/admin/x   → /admin/x?theme=abc
  // Once the cookie is set on first hit, the `?theme=` is no longer needed.
  async redirects() {
    // Order matters. The bare `/r/:id` rule must come before the
    // catch-all `/r/:id/:rest*` — Next.js's `*` quantifier (zero-or-more)
    // matches an empty rest segment and substitutes oddly, producing
    // `/r/<id>?theme=<id>` instead of `/?theme=<id>`. Putting the explicit
    // rule first sidesteps the bug.
    return [
      {
        source: "/r/:id/login",
        destination: "/login?theme=:id",
        permanent: false,
      },
      {
        source: "/r/:id/admin/:rest*",
        destination: "/admin/:rest*?theme=:id",
        permanent: false,
      },
      {
        source: "/r/:id/admin",
        destination: "/admin?theme=:id",
        permanent: false,
      },
      {
        source: "/r/:id/dashboard",
        destination: "/?theme=:id",
        permanent: false,
      },
      {
        source: "/r/:id",
        destination: "/?theme=:id",
        permanent: false,
      },
      {
        source: "/r/:id/:rest*",
        destination: "/:rest*?theme=:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
