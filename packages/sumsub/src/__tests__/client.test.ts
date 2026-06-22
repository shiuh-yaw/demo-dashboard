import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSumsubClient, type SumsubClient } from "../client";
import type { Applicant, AccessToken, ReuseIdentityPreview } from "../types";

const MOCK_CONFIG = {
  appToken: "sbx:test_token",
  secretKey: "test_secret",
  env: "sandbox" as const,
};

describe("SumsubClient", () => {
  let client: SumsubClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = createSumsubClient(MOCK_CONFIG);
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockJsonResponse<T>(data: T, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    } as Response;
  }

  function mockEmptyResponse(status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ "content-type": "text/plain" }),
      json: () => Promise.reject(new Error("no json")),
      text: () => Promise.resolve(""),
    } as Response;
  }

  // -----------------------------------------------------------------------
  // Applicants
  // -----------------------------------------------------------------------

  describe("createApplicant", () => {
    it("POSTs to /resources/applicants with levelName query param", async () => {
      const mockApplicant: Applicant = { id: "app_123", externalUserId: "user_1" };
      fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockApplicant));

      const result = await client.createApplicant({
        externalUserId: "user_1",
        levelName: "basic-kyc",
      });

      expect(result).toEqual(mockApplicant);
      const [url, opts] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/applicants?levelName=basic-kyc");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.externalUserId).toBe("user_1");
      expect(body.levelName).toBeUndefined();
    });
  });

  describe("getApplicant", () => {
    it("GETs /resources/applicants/{id}/one", async () => {
      const mockApplicant: Applicant = { id: "app_123" };
      fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockApplicant));

      const result = await client.getApplicant("app_123");

      expect(result).toEqual(mockApplicant);
      const [url, opts] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/applicants/app_123/one");
      expect(opts.method).toBe("GET");
    });
  });

  describe("getApplicantByExternalId", () => {
    it("GETs with externalUserId segment syntax", async () => {
      const mockApplicant: Applicant = { id: "app_456", externalUserId: "ext_1" };
      fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockApplicant));

      const result = await client.getApplicantByExternalId("ext_1");

      expect(result).toEqual(mockApplicant);
      const [url] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/applicants/-;externalUserId=ext_1/one");
    });
  });

  describe("getApplicantStatus", () => {
    it("GETs requiredIdDocsStatus", async () => {
      const mockStatus = { reviewStatus: "completed", reviewResult: { reviewAnswer: "GREEN" } };
      fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockStatus));

      const result = await client.getApplicantStatus("app_123");

      expect(result).toEqual(mockStatus);
      const [url] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/applicants/app_123/requiredIdDocsStatus");
    });
  });

  // -----------------------------------------------------------------------
  // Access tokens
  // -----------------------------------------------------------------------

  describe("generateAccessToken", () => {
    it("POSTs to /resources/accessTokens/sdk with query params", async () => {
      const mockToken: AccessToken = { token: "sdk_token_abc", userId: "user_1" };
      fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockToken));

      const result = await client.generateAccessToken({
        userId: "user_1",
        levelName: "basic-kyc",
      });

      expect(result).toEqual(mockToken);
      const [url, opts] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/accessTokens/sdk?");
      expect(url).toContain("userId=user_1");
      expect(url).toContain("levelName=basic-kyc");
      expect(opts.method).toBe("POST");
    });

    it("includes ttlInSecs when provided", async () => {
      fetchSpy.mockResolvedValueOnce(mockJsonResponse({ token: "t" }));

      await client.generateAccessToken({
        userId: "u",
        levelName: "l",
        ttlInSecs: 1200,
      });

      const [url] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("ttlInSecs=1200");
    });
  });

  describe("generateShareToken", () => {
    it("POSTs to /resources/accessTokens/shareToken", async () => {
      const mockToken: AccessToken = { token: "share_token_xyz" };
      fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockToken));

      const result = await client.generateShareToken({
        applicantId: "app_123",
        levelName: "basic-kyc",
      });

      expect(result).toEqual(mockToken);
      const [url, opts] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/accessTokens/shareToken");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.applicantId).toBe("app_123");
    });
  });

  // -----------------------------------------------------------------------
  // Reusable identity
  // -----------------------------------------------------------------------

  describe("reuseIdentity", () => {
    it("POSTs to /resources/api/reusableIdentity/reuse with query params", async () => {
      const mockApplicant: Applicant = { id: "new_app" };
      fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockApplicant));

      const result = await client.reuseIdentity({
        shareToken: "share_abc",
        levelName: "basic-kyc",
        userId: "ext_user",
      });

      expect(result).toEqual(mockApplicant);
      const [url, opts] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/api/reusableIdentity/reuse?");
      expect(url).toContain("shareToken=share_abc");
      expect(url).toContain("levelName=basic-kyc");
      expect(url).toContain("userId=ext_user");
      expect(opts.method).toBe("POST");
    });

    it("omits optional params when not provided", async () => {
      fetchSpy.mockResolvedValueOnce(mockJsonResponse({ id: "x" }));

      await client.reuseIdentity({
        shareToken: "t",
        levelName: "l",
      });

      const [url] = fetchSpy.mock.calls[0]!;
      expect(url).not.toContain("userId=");
      expect(url).not.toContain("sourceKey=");
    });
  });

  describe("previewReuseIdentity", () => {
    it("GETs the preview endpoint", async () => {
      const mockPreview: ReuseIdentityPreview = { id: "preview_id", info: { firstName: "Ada" } };
      fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockPreview));

      const result = await client.previewReuseIdentity({
        shareToken: "share_abc",
        levelName: "basic-kyc",
      });

      expect(result).toEqual(mockPreview);
      const [url, opts] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/api/reusableIdentity/reuse/preview?");
      expect(opts.method).toBe("GET");
    });
  });

  // -----------------------------------------------------------------------
  // Sandbox helpers
  // -----------------------------------------------------------------------

  describe("resetApplicant", () => {
    it("POSTs to /resources/applicants/{id}/reset", async () => {
      fetchSpy.mockResolvedValueOnce(mockEmptyResponse());

      await client.resetApplicant("app_123");

      const [url, opts] = fetchSpy.mock.calls[0]!;
      expect(url).toContain("/resources/applicants/app_123/reset");
      expect(opts.method).toBe("POST");
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe("error handling", () => {
    it("throws on non-ok GET response", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      } as Response);

      await expect(client.getApplicant("bad_id")).rejects.toThrow(
        /SumSub GET.*failed \(401\)/,
      );
    });

    it("throws on non-ok POST response", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request"),
      } as Response);

      await expect(
        client.createApplicant({ externalUserId: "u", levelName: "l" }),
      ).rejects.toThrow(/SumSub POST.*failed \(400\)/);
    });
  });
});
