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
     * Comma-separated allow-list of `http(s)` hosts accepted in `redirect_uri`.
     * Bare hostnames only - no scheme, no path, no wildcards. Port is ignored.
     *
     * This is the open-redirect control. Scheme validation alone does not
     * provide it: `https://` to an attacker's host passes every scheme check.
     * Unset means permissive (any host, with a console warning) so existing
     * integrations keep working - matches upstream iframe-fb PR #28.
     */
    NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_HOSTS: z.string().optional(),

    /** Dashboard ingest base URL for GTM analytics. Optional - no-op when unset. */
    NEXT_PUBLIC_TRACK_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DASHBOARD_API_URL: process.env.DASHBOARD_API_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_HOSTS:
      process.env.NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_HOSTS,
    NEXT_PUBLIC_TRACK_URL: process.env.NEXT_PUBLIC_TRACK_URL,
  },
});
