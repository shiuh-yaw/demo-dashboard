/**
 * Route-level tests for the `/api/events` ingest pipeline
 * (`createTrackHandler`). Mirrors the fixture-replay style of
 * `src/lib/webhooks/__tests__/handler-factory.test.ts` - fakes for the
 * rate limiter and services, real Request/Response objects.
 */

import { describe, expect, it, vi } from "vitest";

import type { TrackBatch } from "@dynamic-demos/analytics";

import type {
  ShareLinkService,
  VisitorSessionService,
} from "@/lib/services/types";

import { createTrackHandler, type TrackLogger } from "./handler";
import {
  createFixedWindowRateLimiter,
  type TrackRateLimitClient,
  type TrackRateLimiter,
} from "./rate-limit";

const ALLOWED_ORIGIN = "https://wallet.example.com";
const SALT = "test-salt";
const RAW_IP = "203.0.113.77";

function validBatch(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "11111111-1111-4111-8111-111111111111",
    anonId: "22222222-2222-4222-8222-222222222222",
    demoSlug: "wallet",
    events: [
      {
        eventId: "33333333-3333-4333-8333-333333333333",
        type: "pageview",
        name: "pageview",
        ts: Date.now(),
      },
    ],
    ...overrides,
  };
}

function createFakeRateLimiter(
  result: { success: boolean } = { success: true },
): TrackRateLimiter & { limit: ReturnType<typeof vi.fn> } {
  return { limit: vi.fn().mockResolvedValue(result) };
}

/** In-memory `incr`/`expire` client for exercising the real fixed-window
 * limiter logic against many distinct identifiers (used by the C1 test). */
function createInMemoryRateLimitClient(): TrackRateLimitClient {
  const counts = new Map<string, number>();
  return {
    async incr(key) {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    async expire() {
      return 1;
    },
  };
}

function createFakeShareLinkService(
  resolved: { id: string; prospect?: { id: string } } | null = null,
): Pick<ShareLinkService, "resolveByToken"> & {
  resolveByToken: ReturnType<typeof vi.fn>;
} {
  return {
    resolveByToken: vi.fn().mockResolvedValue(resolved),
  };
}

function createFakeVisitorSessionService(): Pick<
  VisitorSessionService,
  "upsertFromBatch"
> & { upsertFromBatch: ReturnType<typeof vi.fn> } {
  return {
    upsertFromBatch: vi.fn().mockResolvedValue({ created: true }),
  };
}

function createCapturingLogger(): TrackLogger & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    info: (line) => lines.push(line),
    error: (line) => lines.push(line),
  };
}

interface BuildHandlerOpts {
  rateLimiter?: TrackRateLimiter;
  ipRateLimiter?: TrackRateLimiter;
  resolvedShareLink?: { id: string; prospect?: { id: string } } | null;
  logger?: TrackLogger;
  onBatchIngested?: (args: {
    batch: TrackBatch;
    created: boolean;
    prospectId: string | null;
    isInternal: boolean;
  }) => void;
}

function buildHandler(opts: BuildHandlerOpts = {}) {
  const shareLinkService = createFakeShareLinkService(
    opts.resolvedShareLink ?? null,
  );
  const visitorSessionService = createFakeVisitorSessionService();
  const rateLimiter = opts.rateLimiter ?? createFakeRateLimiter();
  const ipRateLimiter = opts.ipRateLimiter ?? createFakeRateLimiter();
  const logger = opts.logger ?? createCapturingLogger();

  const handlers = createTrackHandler({
    allowedOrigins: [ALLOWED_ORIGIN],
    ipHashSalt: SALT,
    shareLinkService,
    visitorSessionService,
    rateLimiter,
    ipRateLimiter,
    logger,
    onBatchIngested: opts.onBatchIngested,
  });

  return { handlers, shareLinkService, visitorSessionService, logger };
}

function buildRequest(opts: {
  body: unknown;
  origin?: string | null;
  ip?: string | null;
  userAgent?: string;
  cookie?: string;
  extraHeaders?: Record<string, string>;
}): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...opts.extraHeaders,
  };
  if (opts.origin !== null) headers.origin = opts.origin ?? ALLOWED_ORIGIN;
  if (opts.ip !== null) headers["x-forwarded-for"] = opts.ip ?? RAW_IP;
  if (opts.userAgent) headers["user-agent"] = opts.userAgent;
  if (opts.cookie) headers.cookie = opts.cookie;

  return new Request("http://localhost/api/events", {
    method: "POST",
    headers,
    body: typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });
}

describe("createTrackHandler POST", () => {
  it("accepts a valid batch, persists it, and returns 200", async () => {
    const { handlers, visitorSessionService } = buildHandler();
    const res = await handlers.POST(buildRequest({ body: validBatch() }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(visitorSessionService.upsertFromBatch).toHaveBeenCalledTimes(1);
    const [batchArg, metaArg] =
      visitorSessionService.upsertFromBatch.mock.calls[0];
    expect(batchArg.sessionId).toBe(validBatch().sessionId);
    expect(metaArg.shareLinkId).toBeNull();
    expect(metaArg.isInternal).toBe(false);
  });

  it("echoes CORS headers for the allowed origin", async () => {
    const { handlers } = buildHandler();
    const res = await handlers.POST(buildRequest({ body: validBatch() }));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      ALLOWED_ORIGIN,
    );
  });

  it("rejects a disallowed origin with 403 and does no work", async () => {
    const { handlers, visitorSessionService } = buildHandler();
    const res = await handlers.POST(
      buildRequest({ body: validBatch(), origin: "https://evil.example.com" }),
    );
    expect(res.status).toBe(403);
    expect(visitorSessionService.upsertFromBatch).not.toHaveBeenCalled();
  });

  it("rejects a missing origin with 403", async () => {
    const { handlers } = buildHandler();
    const res = await handlers.POST(
      buildRequest({ body: validBatch(), origin: null }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 on a schema-invalid batch", async () => {
    const { handlers, visitorSessionService } = buildHandler();
    const res = await handlers.POST(
      buildRequest({ body: { nonsense: true } }),
    );
    expect(res.status).toBe(400);
    expect(visitorSessionService.upsertFromBatch).not.toHaveBeenCalled();
  });

  it("returns 413 without persisting when content-length exceeds the size precheck cap (M1)", async () => {
    const { handlers, visitorSessionService } = buildHandler();
    const res = await handlers.POST(
      buildRequest({
        body: validBatch(),
        extraHeaders: { "content-length": "5000000" },
      }),
    );
    expect(res.status).toBe(413);
    expect(visitorSessionService.upsertFromBatch).not.toHaveBeenCalled();
  });

  it("returns 400 on malformed JSON (e.g. a truncated sendBeacon body)", async () => {
    const { handlers } = buildHandler();
    const res = await handlers.POST(
      buildRequest({ body: "{not-json" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 with no body when the per-session rate limiter rejects", async () => {
    const { handlers, visitorSessionService } = buildHandler({
      rateLimiter: createFakeRateLimiter({ success: false }),
    });
    const res = await handlers.POST(buildRequest({ body: validBatch() }));
    expect(res.status).toBe(429);
    expect(await res.text()).toBe("");
    expect(visitorSessionService.upsertFromBatch).not.toHaveBeenCalled();
  });

  it("returns 429 with no body when the coarse ip-only rate limiter rejects (C1)", async () => {
    const { handlers, visitorSessionService } = buildHandler({
      ipRateLimiter: createFakeRateLimiter({ success: false }),
    });
    const res = await handlers.POST(buildRequest({ body: validBatch() }));
    expect(res.status).toBe(429);
    expect(await res.text()).toBe("");
    expect(visitorSessionService.upsertFromBatch).not.toHaveBeenCalled();
  });

  describe("dual-key rate limiting (C1 - anonId rotation cannot bypass the ip ceiling)", () => {
    it("still 429s a single host once its ip-only ceiling trips, even though every request mints a fresh anonId/sessionId (which resets the per-session bucket each time)", async () => {
      const client = createInMemoryRateLimitClient();
      // Coarse ip-only cap: 5/min. Per-session cap: 1000/min (effectively
      // never trips on its own here) - isolates the ip-level control.
      const ipRateLimiter = createFixedWindowRateLimiter(client, {
        limit: 5,
        windowSeconds: 60,
      });
      const rateLimiter = createFixedWindowRateLimiter(client, {
        limit: 1000,
        windowSeconds: 60,
      });
      const { handlers, visitorSessionService } = buildHandler({
        rateLimiter,
        ipRateLimiter,
      });

      const statuses: number[] = [];
      for (let i = 0; i < 8; i++) {
        // A scripted attacker mints a fresh anonId + sessionId per request -
        // exactly the C1 exploit shape - from the same source IP.
        const res = await handlers.POST(
          buildRequest({
            body: validBatch({
              anonId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
              sessionId: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
            }),
          }),
        );
        statuses.push(res.status);
      }

      // First 5 requests pass the ip ceiling; the rest are rejected despite
      // every one carrying a brand-new anonId/sessionId pair.
      expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429, 429]);
      expect(visitorSessionService.upsertFromBatch).toHaveBeenCalledTimes(5);
    });
  });

  it("persists retried/duplicate batches idempotently (2xx, service invoked per delivery)", async () => {
    const { handlers, visitorSessionService } = buildHandler();
    const batch = validBatch();
    const res1 = await handlers.POST(buildRequest({ body: batch }));
    const res2 = await handlers.POST(buildRequest({ body: batch }));
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Idempotency (skipDuplicates) is the service's job, already covered by
    // visitor-sessions.test.ts - the route must simply not error on replay.
    expect(visitorSessionService.upsertFromBatch).toHaveBeenCalledTimes(2);
  });

  it("treats an invalid/unresolvable share token as unattributed, not an error", async () => {
    const { handlers, visitorSessionService } = buildHandler({
      resolvedShareLink: null,
    });
    const res = await handlers.POST(
      buildRequest({ body: validBatch({ shareToken: "dead-token" }) }),
    );
    expect(res.status).toBe(200);
    const [, metaArg] = visitorSessionService.upsertFromBatch.mock.calls[0];
    expect(metaArg.shareLinkId).toBeNull();
  });

  it("attributes to the resolved share link id when the token is valid", async () => {
    const { handlers, visitorSessionService } = buildHandler({
      resolvedShareLink: { id: "share_123" },
    });
    const res = await handlers.POST(
      buildRequest({ body: validBatch({ shareToken: "good-token" }) }),
    );
    expect(res.status).toBe(200);
    const [, metaArg] = visitorSessionService.upsertFromBatch.mock.calls[0];
    expect(metaArg.shareLinkId).toBe("share_123");
  });

  it("invokes onBatchIngested after a successful upsert with prospectId + isInternal", async () => {
    const onBatchIngested = vi.fn();
    const { handlers } = buildHandler({
      resolvedShareLink: { id: "sl1", prospect: { id: "p1" } },
      onBatchIngested,
    });
    const res = await handlers.POST(
      buildRequest({ body: validBatch({ shareToken: "tok" }) }),
    );
    expect(res.status).toBe(200);
    expect(onBatchIngested).toHaveBeenCalledWith(
      expect.objectContaining({
        prospectId: "p1",
        isInternal: false,
        created: expect.any(Boolean),
      }),
    );
  });

  it("still returns 200 and persists when onBatchIngested throws synchronously", async () => {
    const onBatchIngested = vi.fn(() => {
      throw new Error("boom");
    });
    const { handlers, visitorSessionService } = buildHandler({
      onBatchIngested,
    });
    const res = await handlers.POST(buildRequest({ body: validBatch() }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(visitorSessionService.upsertFromBatch).toHaveBeenCalledTimes(1);
    expect(onBatchIngested).toHaveBeenCalledTimes(1);
  });

  it("propagates isInternal=true from the dd_internal cookie", async () => {
    const { handlers, visitorSessionService } = buildHandler();
    await handlers.POST(
      buildRequest({ body: validBatch(), cookie: "dd_internal=1" }),
    );
    const [, metaArg] = visitorSessionService.upsertFromBatch.mock.calls[0];
    expect(metaArg.isInternal).toBe(true);
  });

  it("propagates isInternal=true from the client batch hint", async () => {
    const { handlers, visitorSessionService } = buildHandler();
    await handlers.POST(
      buildRequest({ body: validBatch({ isInternal: true }) }),
    );
    const [, metaArg] = visitorSessionService.upsertFromBatch.mock.calls[0];
    expect(metaArg.isInternal).toBe(true);
  });

  it("derives geo and UA from headers into meta", async () => {
    const { handlers, visitorSessionService } = buildHandler();
    const req = buildRequest({
      body: validBatch(),
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    req.headers.set("x-vercel-ip-country", "US");
    req.headers.set("x-vercel-ip-country-region", "CA");
    req.headers.set("x-vercel-ip-city", "San%20Francisco");

    await handlers.POST(req);
    const [, metaArg] = visitorSessionService.upsertFromBatch.mock.calls[0];
    expect(metaArg.geo).toEqual({
      country: "US",
      region: "CA",
      city: "San Francisco",
    });
    expect(metaArg.ua).toEqual({
      device: "Desktop",
      os: "macOS",
      browser: "Chrome",
    });
  });

  it("never persists or logs the raw client IP", async () => {
    const logger = createCapturingLogger();
    const { handlers, visitorSessionService } = buildHandler({ logger });
    await handlers.POST(buildRequest({ body: validBatch(), ip: RAW_IP }));

    const [, metaArg] = visitorSessionService.upsertFromBatch.mock.calls[0];
    expect(JSON.stringify(metaArg)).not.toContain(RAW_IP);
    expect(logger.lines.join("\n")).not.toContain(RAW_IP);
    // The ipHash it does carry must actually be derived from the salt+ip.
    expect(metaArg.ipHash).toHaveLength(64); // sha256 hex digest length
  });

  it("logs one info line per accepted batch in the documented shape", async () => {
    const logger = createCapturingLogger();
    const { handlers } = buildHandler({
      logger,
      resolvedShareLink: { id: "share_123" },
    });
    await handlers.POST(
      buildRequest({ body: validBatch({ shareToken: "good-token" }) }),
    );
    const line = logger.lines.find((l) => l.startsWith("[track] batch"));
    expect(line).toBeDefined();
    expect(line).toContain("session=11111111-1111-4111-8111-111111111111");
    expect(line).toContain("demo=wallet");
    expect(line).toContain("events=1");
    expect(line).toContain("attributed=true");
    expect(line).toContain("internal=false");
    expect(line).toMatch(/durMs=\d+/);
  });
});

describe("createTrackHandler OPTIONS", () => {
  it("returns 204 with CORS headers for an allowed origin", async () => {
    const { handlers } = buildHandler();
    const res = await handlers.OPTIONS(
      new Request("http://localhost/api/events", {
        method: "OPTIONS",
        headers: { origin: ALLOWED_ORIGIN },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      ALLOWED_ORIGIN,
    );
  });

  it("returns 403 for a disallowed origin preflight", async () => {
    const { handlers } = buildHandler();
    const res = await handlers.OPTIONS(
      new Request("http://localhost/api/events", {
        method: "OPTIONS",
        headers: { origin: "https://evil.example.com" },
      }),
    );
    expect(res.status).toBe(403);
  });
});
