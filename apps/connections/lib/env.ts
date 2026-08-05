/**
 * Environment variable configuration and validation.
 */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  server: {
    /**
     * Dashboard API URL for fetching connect configs (branding + theme).
     * Defaults to http://localhost:4000 in local dev.
     */
    DASHBOARD_API_URL: z
      .string()
      .url()
      .optional()
      .default("http://localhost:4000"),
  },
  client: {
    /**
     * Dynamic Labs environment ID. A public client identifier, not a secret.
     * Falls back to the workspace default inside `resolveCredentials()`.
     */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().optional(),

    /**
     * Where to send the user after a successful connection when the caller
     * supplies no `redirect_uri`. See lib/redirect.ts for the contract.
     *
     * Deliberately has no default: unset means the same-origin `/callback`
     * page, which shows the params we handed back. An external default sent the
     * user off-site and hid the only interesting output of the flow.
     */
    NEXT_PUBLIC_CONNECT_REDIRECT_BASE_URL: z.string().url().optional(),

    /**
     * Comma-separated strict allow-list of URL schemes accepted in
     * `redirect_uri`. Unset means permissive mode: http(s) plus any custom app
     * scheme that is hierarchical and not on the dangerous block-list.
     *
     * Deployments that expose this flow publicly SHOULD set this, and SHOULD
     * additionally allow-list permitted `http(s)` hosts - reading a redirect
     * target from a query param is an open-redirect surface.
     */
    NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_SCHEMES: z.string().optional(),

    /** Dashboard ingest base URL for GTM analytics. Optional - no-op when unset. */
    NEXT_PUBLIC_TRACK_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DASHBOARD_API_URL: process.env.DASHBOARD_API_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_CONNECT_REDIRECT_BASE_URL:
      process.env.NEXT_PUBLIC_CONNECT_REDIRECT_BASE_URL,
    NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_SCHEMES:
      process.env.NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_SCHEMES,
    NEXT_PUBLIC_TRACK_URL: process.env.NEXT_PUBLIC_TRACK_URL,
  },
});
