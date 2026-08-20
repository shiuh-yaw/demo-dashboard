"use client";

/**
 * Browser -> this app's own `/api/delegation/*` routes. Same-origin: the
 * delegated share is held by the app the user delegated TO, so there is no
 * cross-app hop and no second webhook secret to keep in sync.
 *
 * The JWT still travels explicitly rather than relying on cookies - this app
 * is a client-side Dynamic singleton with no cookie sync (see AGENTS.md).
 */

export interface DelegatedSignature {
  signature: string;
  signer: string;
  /** Server clock, not the browser's. */
  signedAt: string;
  /** Where the ceremony ran: a Vercel region, or "localhost" in dev. */
  server: string;
}

/** Thrown when the server has no materials yet - the webhook race, not a real failure. */
export class DelegationNotReadyError extends Error {
  constructor() {
    super("Your server hasn't received the delegated share yet");
    this.name = "DelegationNotReadyError";
  }
}

/**
 * Delegation is served by this app, so there is no URL to configure. The
 * section is always offered; the routes themselves report 503 when the store
 * or keys are missing.
 */
export function isDelegationConfigured(): boolean {
  return true;
}

function authHeaders(token: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  token: string | null | undefined,
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: authHeaders(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 409) throw new DelegationNotReadyError();

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error ?? `Delegation request failed (${response.status})`,
    );
  }
  return payload as T;
}

/**
 * Ask the server to sign as the user, keyed by wallet ADDRESS - the client has
 * no reliable `walletId`. Throws DelegationNotReadyError while the webhook is
 * still in flight.
 */
export function signAsDelegate(
  token: string | null | undefined,
  input: { address: string; message: string },
): Promise<DelegatedSignature> {
  return request("POST", "/api/delegation/sign", token, input);
}
