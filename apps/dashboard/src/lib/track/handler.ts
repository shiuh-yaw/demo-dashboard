/**
 * Core `/api/events` ingest logic, factored out of the route file so tests
 * can inject fakes for the rate limiter and services - mirrors
 * `src/lib/webhooks/handler-factory.ts`'s `createWebhookHandler` shape.
 *
 * Pipeline: CORS allowlist -> size precheck -> parse body -> schema
 * validate -> rate limit (coarse per-ipHash ceiling, then finer
 * per-(ipHash, session) bucket) -> resolve share token -> derive geo/UA
 * -> upsert session + events.
 * Every rejection before the final upsert is 2xx/4xx-only noise to the
 * tracker (which drops silently on non-2xx) - nothing here may throw
 * into a demo's render path, so all work happens server-side only.
 */

import { trackBatchSchema } from "@dynamic-demos/analytics";

import type {
  ShareLinkService,
  VisitorSessionService,
} from "@/lib/services/types";

import { corsHeadersForOrigin, isAllowedTrackOrigin } from "@/lib/track-cors";
import { deriveGeo } from "./geo";
import { extractClientIp, hashIp } from "./ip-hash";
import { parseUserAgent } from "./ua";
import type { TrackRateLimiter } from "./rate-limit";

export interface TrackLogger {
  info(line: string): void;
  error(line: string, err?: unknown): void;
}

const DEFAULT_LOGGER: TrackLogger = {
  info: (line) => console.info(line),
  error: (line, err) => {
    if (err !== undefined) console.error(line, err);
    else console.error(line);
  },
};

export interface CreateTrackHandlerOptions {
  /** Exact-match allowlist, e.g. `env.TRACK_CORS_ORIGINS.split(",")`. */
  allowedOrigins: string[];
  /** `sha256(ip + salt)` salt - never logged, never persisted raw. */
  ipHashSalt: string;
  shareLinkService: Pick<ShareLinkService, "resolveByToken">;
  visitorSessionService: Pick<VisitorSessionService, "upsertFromBatch">;
  /** Finer per-(ipHash, session) limiter - fair per-viewer bucketing. */
  rateLimiter: TrackRateLimiter;
  /**
   * Coarse per-ipHash-only limiter (C1) - gates ahead of `rateLimiter`.
   * Never keyed on a client-controlled field (anonId/sessionId/shareToken),
   * so rotating those cannot reset this bucket the way it can the finer one.
   */
  ipRateLimiter: TrackRateLimiter;
  logger?: TrackLogger;
  /** Cookie name the dashboard's own launch flow sets to mark self-views. Defaults to `dd_internal`. */
  internalCookieName?: string;
}

/**
 * Cheap size precheck (M1) - a valid batch (50 events, 2048-char props
 * each) serializes well under this; rejecting on `content-length` first
 * avoids paying JSON.parse + Zod cost on grossly oversized bodies. Bounded
 * defense only - the header is client-supplied and skipped when absent
 * (e.g. chunked transfer), so this never replaces schema validation.
 */
const MAX_TRACK_BODY_BYTES = 200_000;

export interface TrackHandlers {
  POST: (req: Request) => Promise<Response>;
  OPTIONS: (req: Request) => Promise<Response>;
}

function getCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export function createTrackHandler(
  opts: CreateTrackHandlerOptions,
): TrackHandlers {
  const {
    allowedOrigins,
    ipHashSalt,
    shareLinkService,
    visitorSessionService,
    rateLimiter,
    ipRateLimiter,
    logger = DEFAULT_LOGGER,
    internalCookieName = "dd_internal",
  } = opts;

  async function OPTIONS(req: Request): Promise<Response> {
    const origin = req.headers.get("origin");
    if (!isAllowedTrackOrigin(origin, allowedOrigins)) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: corsHeadersForOrigin(origin, allowedOrigins)!,
    });
  }

  async function POST(req: Request): Promise<Response> {
    const startedAt = Date.now();
    const origin = req.headers.get("origin");

    // 1. CORS allowlist - disallowed origins get no processing at all.
    if (!isAllowedTrackOrigin(origin, allowedOrigins)) {
      return new Response(null, { status: 403 });
    }
    const corsHeaders = corsHeadersForOrigin(origin, allowedOrigins)!;

    // 2. Cheap size precheck (M1) - reject grossly oversized bodies off the
    // declared Content-Length before paying to read/parse them. Absent
    // header (e.g. chunked transfer) skips this and falls through to
    // normal parse + schema validation.
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_TRACK_BODY_BYTES) {
      return new Response(null, { status: 413, headers: corsHeaders });
    }

    // 3. Parse body - `sendBeacon` may deliver `text/plain`, so always
    // read as text and JSON.parse rather than relying on req.json().
    const rawBody = await req.text();
    let parsedBody: unknown;
    try {
      parsedBody = rawBody.length === 0 ? {} : JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "invalid-json" }, 400, corsHeaders);
    }

    // 4. Schema validate against the shared Zod source of truth.
    const result = trackBatchSchema.safeParse(parsedBody);
    if (!result.success) {
      return jsonResponse({ error: "invalid-batch" }, 400, corsHeaders);
    }
    const batch = result.data;

    // 5. Rate limit - two keys layered (C1). `ipRateLimiter` is a coarse
    // ceiling keyed on ipHash alone: it cannot be evaded by rotating
    // client-minted ids, so it bounds total volume from one host regardless
    // of how many distinct anonId/sessionId/shareToken values it sends.
    // `rateLimiter` then applies the finer per-(ipHash, share token or
    // anonId) bucket for fair per-viewer limiting on top of that floor.
    const clientIp = extractClientIp(req.headers);
    const ipHash = hashIp(clientIp ?? "unknown", ipHashSalt);

    const ipRateLimitResult = await ipRateLimiter.limit(`track:ip:${ipHash}`);
    if (!ipRateLimitResult.success) {
      // No body - the tracker drops silently on non-2xx by design.
      return new Response(null, { status: 429 });
    }

    const identifier = `track:${ipHash}:${batch.shareToken ?? batch.anonId}`;
    const rateLimitResult = await rateLimiter.limit(identifier);
    if (!rateLimitResult.success) {
      // No body - the tracker drops silently on non-2xx by design.
      return new Response(null, { status: 429 });
    }

    // 6. Resolve share token. Invalid/revoked/expired tokens are NOT
    // errors - the session persists unattributed.
    let shareLinkId: string | null = null;
    if (batch.shareToken) {
      const resolved = await shareLinkService.resolveByToken(batch.shareToken);
      shareLinkId = resolved?.id ?? null;
    }

    // 7. Derive geo/UA server-side - never trust these from the client.
    // `VisitorSessionMeta.ua` fields are `string | undefined`;
    // `parseUserAgent` returns `null` for unrecognized values, so map
    // null -> undefined at this boundary.
    const geo = deriveGeo(req.headers);
    const parsedUa = parseUserAgent(req.headers.get("user-agent"));
    const ua = {
      device: parsedUa.device ?? undefined,
      os: parsedUa.os ?? undefined,
      browser: parsedUa.browser ?? undefined,
    };

    // Authoritative isInternal: the dashboard's own launch flow sets the
    // `dd_internal` cookie (from `?internal=1`); the client-declared
    // `batch.isInternal` hint is honored too since some launch paths
    // (e.g. iframe embeds) may not carry the cookie.
    const isInternal =
      getCookie(req.headers, internalCookieName) === "1" ||
      batch.isInternal === true;

    try {
      await visitorSessionService.upsertFromBatch(batch, {
        geo,
        ua,
        ipHash,
        shareLinkId,
        isInternal,
      });
    } catch (err) {
      logger.error(
        `[track] persist-failed session=${batch.sessionId} demo=${batch.demoSlug} reason=${stringifyErr(err)}`,
        err,
      );
      return jsonResponse({ error: "persist-failed" }, 500, corsHeaders);
    }

    logger.info(
      `[track] batch session=${batch.sessionId} demo=${batch.demoSlug} events=${batch.events.length} attributed=${shareLinkId !== null} internal=${isInternal} durMs=${Date.now() - startedAt}`,
    );

    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return { POST, OPTIONS };
}

function stringifyErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
