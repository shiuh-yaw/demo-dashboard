/**
 * SumSub REST API client.
 *
 * Minimal wrapper around the SumSub Public API. Sandbox-by-default (D-005).
 * Auth uses App Token + HMAC-SHA256 signing per
 * https://docs.sumsub.com/reference/authentication.
 */

import { signRequest } from "./auth";
import type {
  AccessToken,
  Applicant,
  ApplicantReview,
  CreateApplicantRequest,
  GenerateAccessTokenRequest,
  GenerateShareTokenRequest,
  ISumsubClient,
  ReuseIdentityRequest,
  ReuseIdentityPreview,
  SumsubClientConfig,
  SumsubEnvironment,
} from "./types";

const DEFAULT_BASE_URL = "https://api.sumsub.com";

/** Error thrown for non-2xx SumSub responses, carrying the HTTP status. */
export class SumsubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly method: string,
    public readonly path: string,
    public readonly responseBody: string,
  ) {
    super(`SumSub ${method} ${path} failed (${status}): ${responseBody}`);
    this.name = "SumsubApiError";
  }
}

export function resolveSumsubBaseUrl(_env: SumsubEnvironment): string {
  return DEFAULT_BASE_URL;
}

export interface CreateSumsubClientOptions extends SumsubClientConfig {}

export function createSumsubClient(
  config: CreateSumsubClientOptions,
): SumsubClient {
  return new SumsubClient(config);
}

export class SumsubClient implements ISumsubClient {
  private readonly appToken: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: SumsubClientConfig) {
    this.appToken = config.appToken;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl ?? resolveSumsubBaseUrl(config.env ?? "sandbox");
  }

  // -------------------------------------------------------------------------
  // Applicants
  // -------------------------------------------------------------------------

  async createApplicant(request: CreateApplicantRequest): Promise<Applicant> {
    const { levelName, ...body } = request;
    const path = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
    try {
      return await this.post<Applicant>(path, body);
    } catch (error) {
      // Idempotency: an applicant already exists for this externalUserId
      // (409). Reuse it instead of failing — re-running KYC for the same
      // wallet should resume the existing applicant.
      if (error instanceof SumsubApiError && error.status === 409) {
        return this.getApplicantByExternalId(request.externalUserId);
      }
      throw error;
    }
  }

  async getApplicant(applicantId: string): Promise<Applicant> {
    return this.get<Applicant>(`/resources/applicants/${applicantId}/one`);
  }

  async getApplicantByExternalId(externalUserId: string): Promise<Applicant> {
    return this.get<Applicant>(
      `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`,
    );
  }

  async getApplicantStatus(applicantId: string): Promise<ApplicantReview> {
    return this.get<ApplicantReview>(
      `/resources/applicants/${applicantId}/requiredIdDocsStatus`,
    );
  }

  // -------------------------------------------------------------------------
  // Access tokens
  // -------------------------------------------------------------------------

  async generateAccessToken(
    request: GenerateAccessTokenRequest,
  ): Promise<AccessToken> {
    // The `/resources/accessTokens/sdk` endpoint reads its parameters from a
    // JSON body (unlike the legacy query-param `/resources/accessTokens`
    // endpoint). Sending query params only fails with 400 "Body must be
    // provided".
    const body: Record<string, unknown> = {
      userId: request.userId,
      levelName: request.levelName,
    };
    if (request.ttlInSecs !== undefined) {
      body.ttlInSecs = request.ttlInSecs;
    }
    return this.post<AccessToken>("/resources/accessTokens/sdk", body);
  }

  async generateShareToken(
    request: GenerateShareTokenRequest,
  ): Promise<AccessToken> {
    return this.post<AccessToken>(
      "/resources/accessTokens/shareToken",
      request,
    );
  }

  // -------------------------------------------------------------------------
  // Reusable identity (reliance KYC / token sharing)
  // -------------------------------------------------------------------------

  async reuseIdentity(request: ReuseIdentityRequest): Promise<Applicant> {
    const params = new URLSearchParams({
      shareToken: request.shareToken,
      levelName: request.levelName,
    });
    if (request.userId) params.set("userId", request.userId);
    if (request.sourceKey) params.set("sourceKey", request.sourceKey);
    return this.post<Applicant>(
      `/resources/api/reusableIdentity/reuse?${params.toString()}`,
    );
  }

  async previewReuseIdentity(
    request: ReuseIdentityRequest,
  ): Promise<ReuseIdentityPreview> {
    const params = new URLSearchParams({
      shareToken: request.shareToken,
      levelName: request.levelName,
    });
    if (request.userId) params.set("userId", request.userId);
    if (request.sourceKey) params.set("sourceKey", request.sourceKey);
    return this.get<ReuseIdentityPreview>(
      `/resources/api/reusableIdentity/reuse/preview?${params.toString()}`,
    );
  }

  // -------------------------------------------------------------------------
  // Sandbox helpers
  // -------------------------------------------------------------------------

  async resetApplicant(applicantId: string): Promise<void> {
    await this.post(`/resources/applicants/${applicantId}/reset`);
  }

  // -------------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    const headers = signRequest(
      this.appToken,
      this.secretKey,
      "GET",
      path,
    );
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new SumsubApiError(res.status, "GET", path, text);
    }
    return res.json() as Promise<T>;
  }

  private async post<T = void>(path: string, body?: unknown): Promise<T> {
    const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;
    const headers = signRequest(
      this.appToken,
      this.secretKey,
      "POST",
      path,
      bodyStr,
    );
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: bodyStr,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new SumsubApiError(res.status, "POST", path, text);
    }
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return undefined as T;
  }
}
