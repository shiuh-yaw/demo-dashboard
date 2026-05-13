/**
 * Raw Fireblocks REST escape hatch.
 *
 * For endpoints not covered by `@fireblocks/ts-sdk` or the typed
 * wrappers in this package. Auth (JWT + X-API-Key) is handled; JSON
 * serialization is handled; retries / pagination are NOT — caller
 * concern.
 *
 * Use the SDK escape hatch (`fb.sdk`) first when the SDK has the
 * method; reach for this raw REST client only when there's no SDK
 * surface for the endpoint you need.
 */

import { signFireblocksRequest } from "./sign-request";

export interface FireblocksApiClient {
  get<T = unknown>(path: string, query?: Record<string, string | number>): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  put<T = unknown>(path: string, body?: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown): Promise<T>;
}

export interface CreateApiClientConfig {
  apiKey: string;
  secretKey: string;
  basePath: string;
}

export class FireblocksApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | undefined,
    public readonly responseBody: unknown,
  ) {
    super(message);
    this.name = "FireblocksApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

function buildUrl(
  basePath: string,
  path: string,
  query?: Record<string, string | number>,
): string {
  const url = `${basePath.replace(/\/$/, "")}${path}`;
  if (!query || Object.keys(query).length === 0) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) params.set(k, String(v));
  return `${url}?${params.toString()}`;
}

function pathWithQuery(
  path: string,
  query?: Record<string, string | number>,
): string {
  if (!query || Object.keys(query).length === 0) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) params.set(k, String(v));
  return `${path}?${params.toString()}`;
}

async function readResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function request<T>(
  config: CreateApiClientConfig,
  method: Method,
  path: string,
  body?: unknown,
  query?: Record<string, string | number>,
): Promise<T> {
  const url = buildUrl(config.basePath, path, query);
  const bodyBuffer = body != null ? Buffer.from(JSON.stringify(body)) : undefined;

  const signed = await signFireblocksRequest({
    secretKey: config.secretKey,
    apiKey: config.apiKey,
    method,
    path: pathWithQuery(path, query),
    bodyBuffer,
  });

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${signed.token}`,
      "X-API-Key": config.apiKey,
      ...(bodyBuffer ? { "Content-Type": "application/json" } : {}),
    },
    ...(bodyBuffer ? { body: bodyBuffer.toString("utf8") } : {}),
  };

  const res = await fetch(url, init);
  const parsed = await readResponse(res);

  if (!res.ok) {
    const code =
      parsed && typeof parsed === "object" && "code" in parsed
        ? (parsed as { code?: string }).code
        : undefined;
    const message =
      parsed && typeof parsed === "object" && "message" in parsed
        ? ((parsed as { message?: string }).message ?? `Fireblocks API ${res.status}`)
        : `Fireblocks API ${res.status}`;
    throw new FireblocksApiError(message, res.status, code, parsed);
  }

  return parsed as T;
}

export function createApiClient(config: CreateApiClientConfig): FireblocksApiClient {
  return {
    get: <T = unknown>(path: string, query?: Record<string, string | number>) =>
      request<T>(config, "GET", path, undefined, query),
    post: <T = unknown>(path: string, body?: unknown) =>
      request<T>(config, "POST", path, body),
    put: <T = unknown>(path: string, body?: unknown) =>
      request<T>(config, "PUT", path, body),
    delete: <T = unknown>(path: string) =>
      request<T>(config, "DELETE", path),
    patch: <T = unknown>(path: string, body?: unknown) =>
      request<T>(config, "PATCH", path, body),
  };
}
