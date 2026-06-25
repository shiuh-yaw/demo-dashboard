/**
 * Server-side Dashboard API client for the KYC deposit flow.
 *
 * Proxies requests to the dashboard's Iron + SumSub endpoints (D-003:
 * apps don't hold provider secrets — they call the dashboard).
 *
 * Auth headers (Authorization / cookie + x-dynamic-environment-id) are
 * forwarded from the incoming user request so the dashboard can verify
 * the caller via `withAuth`.
 */

import { env } from "@/lib/env";

const DASHBOARD_API_URL = env.DASHBOARD_API_URL;

export interface DashboardRequestHeaders {
  authorization?: string | null;
  cookie?: string | null;
  environmentId?: string | null;
}

function buildHeaders(auth?: DashboardRequestHeaders): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth?.authorization) {
    headers["Authorization"] = auth.authorization;
  }
  if (auth?.cookie) {
    headers["Cookie"] = auth.cookie;
  }
  if (auth?.environmentId) {
    headers["x-dynamic-environment-id"] = auth.environmentId;
  }
  return headers;
}

export async function dashboardPost<T>(
  path: string,
  body?: unknown,
  auth?: DashboardRequestHeaders,
): Promise<{ data?: T; error?: string }> {
  if (!DASHBOARD_API_URL) {
    return { error: "DASHBOARD_API_URL is not configured" };
  }

  try {
    const url = `${DASHBOARD_API_URL}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(auth),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        const text = await res.text();
        errorData = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        // parse failure — leave errorData empty
      }
      const errorMessage =
        (errorData.error as string) ||
        `Dashboard request failed: ${res.status} ${res.statusText}`;
      return { error: errorMessage };
    }

    const raw = (await res.json()) as Record<string, unknown>;
    if ("success" in raw) {
      if (!raw.success) return { error: (raw.error as string) || "Request failed" };
      return { data: raw.data as T };
    }
    return { data: raw as T };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Dashboard request failed",
    };
  }
}

export async function dashboardGet<T>(
  path: string,
  auth?: DashboardRequestHeaders,
): Promise<{ data?: T; error?: string }> {
  if (!DASHBOARD_API_URL) {
    return { error: "DASHBOARD_API_URL is not configured" };
  }

  try {
    const url = `${DASHBOARD_API_URL}${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: buildHeaders(auth),
    });

    if (!res.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        const text = await res.text();
        errorData = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        // parse failure
      }
      const errorMessage =
        (errorData.error as string) ||
        `Dashboard request failed: ${res.status} ${res.statusText}`;
      return { error: errorMessage };
    }

    const raw = (await res.json()) as Record<string, unknown>;
    if ("success" in raw) {
      if (!raw.success) return { error: (raw.error as string) || "Request failed" };
      return { data: raw.data as T };
    }
    return { data: raw as T };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Dashboard request failed",
    };
  }
}
