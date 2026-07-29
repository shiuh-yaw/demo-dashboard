"use client";

/**
 * Browser -> dashboard `/api/rain/*` client. The caller supplies the Dynamic
 * JWT (read from useDynamicClient().token in a hook); this module attaches it
 * plus the environment-id header the dashboard withAuth requires, and unwraps
 * the `{ success, data }` envelope. The app never calls Rain directly - the
 * dashboard holds RAIN_API_KEY (hard rule 3).
 */

function dashboardBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_DASHBOARD_URL ??
    process.env.NEXT_PUBLIC_DASHBOARD_API_URL ??
    ""
  );
}

/** The Rain card ids the dashboard needs to make a Rain call on the user's behalf. */
export interface RainCardRef {
  id: string;
  userId: string;
}

function authHeaders(
  token: string | null | undefined,
  card?: RainCardRef,
): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  if (envId) headers["x-dynamic-environment-id"] = envId;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // The app retrieves the card (Dynamic metadata) and hands the ids to the
  // dashboard; the dashboard never resolves the card itself.
  if (card) {
    headers["x-rain-card-id"] = card.id;
    headers["x-rain-user-id"] = card.userId;
  }
  return headers;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  token: string | null | undefined,
  body?: unknown,
  card?: RainCardRef,
): Promise<T> {
  const res = await fetch(`${dashboardBaseUrl()}${path}`, {
    method,
    headers: authHeaders(token, card),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await res.json()
    : await res.text();
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed: ${res.status}`;
    throw new Error(message);
  }
  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as { success: boolean; data?: T; error?: string };
    if (!envelope.success) throw new Error(envelope.error ?? "Request failed");
    return envelope.data as T;
  }
  return payload as T;
}

export function dashboardGet<T>(
  path: string,
  token: string | null | undefined,
  card?: RainCardRef,
): Promise<T> {
  return request<T>("GET", path, token, undefined, card);
}

export function dashboardPost<T>(
  path: string,
  token: string | null | undefined,
  body?: unknown,
  card?: RainCardRef,
): Promise<T> {
  return request<T>("POST", path, token, body, card);
}
