/**
 * Rain issuing API HTTP client.
 *
 * Ported from the OSS stablecoin-card demo, with the error typed (no `any`)
 * and the base URL resolved via `resolveRainBaseUrl` (sandbox default). The
 * constructor takes explicit credentials and never reads process.env
 * (decision D1); the dashboard `getRainClient()` injects them.
 */

import { resolveRainBaseUrl } from "./env";

/** Minimal request surface the method functions depend on. */
export interface RainRequester {
  get<T>(path: string, headers?: Record<string, string>): Promise<T>;
  post<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse>;
}

/** Error thrown on a non-2xx Rain response. */
export class RainApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = "RainApiError";
  }
}

export interface RainClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export class RainClient implements RainRequester {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options?: RainClientOptions) {
    this.baseUrl = resolveRainBaseUrl(options?.baseUrl).replace(/\/$/, "");
    this.apiKey = options?.apiKey;
    this.fetchImpl = options?.fetchImpl ?? fetch.bind(globalThis);
  }

  async request<TResponse>(
    path: string,
    init?: RequestInit,
  ): Promise<TResponse> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;

    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    // Rain authenticates with the `Api-Key` header only (per Rain's
    // OpenAPI `ApiKeyAuth` scheme). The OSS demo also sent a redundant
    // `Authorization: Bearer` - dropped here.
    if (this.apiKey) headers["Api-Key"] = this.apiKey;

    const res = await this.fetchImpl(url, { ...init, headers, cache: "no-store" });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        isJson &&
        payload &&
        typeof payload === "object" &&
        "message" in payload
          ? String((payload as { message: unknown }).message)
          : `Rain request failed with status ${res.status}`;
      throw new RainApiError(message, res.status, payload);
    }

    return payload as TResponse;
  }

  get<TResponse>(
    path: string,
    headers?: Record<string, string>,
  ): Promise<TResponse> {
    return this.request<TResponse>(path, { method: "GET", headers });
  }

  post<TRequest, TResponse>(
    path: string,
    body: TRequest,
  ): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}
