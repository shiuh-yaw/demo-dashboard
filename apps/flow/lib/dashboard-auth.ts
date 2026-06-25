/**
 * Extract auth headers from an incoming request to forward to the dashboard.
 *
 * The dashboard's `withAuth` middleware expects:
 *   - `x-dynamic-environment-id` header (the app's Dynamic env)
 *   - `Authorization: Bearer <jwt>` header OR a `dynamic_jwt` cookie
 *
 * This helper extracts what's available from the incoming user request
 * and packages it for `dashboardPost` / `dashboardGet`.
 */

import { type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { type DashboardRequestHeaders } from "@/lib/dashboard-api";

export function extractDashboardAuth(
  request: NextRequest,
): DashboardRequestHeaders {
  return {
    authorization: request.headers.get("authorization"),
    cookie: request.headers.get("cookie"),
    environmentId: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  };
}
