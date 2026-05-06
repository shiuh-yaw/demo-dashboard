/**
 * Tests for the local-development replay helper.
 *
 * The helper lets engineers re-fire a captured webhook fixture against a
 * running dashboard without ngrok. It signs the body with the supplied
 * webhook secret using the same Svix scheme the verifier validates.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { replay } from "../webhooks";

const SECRET_RAW = "test-replay-secret-bytes";
const SECRET = `whsec_${Buffer.from(SECRET_RAW).toString("base64")}`;

const FIXTURE = {
  type: "payout.complete",
  data: { id: "po_replay_1", status: "completed" },
};

describe("replay()", () => {
  let originalFetch: typeof globalThis.fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs the fixture body with svix headers and a valid signature", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response("OK", { status: 200 });
    }) as unknown as typeof fetch;

    const res = await replay({
      payload: FIXTURE,
      url: "http://localhost:4000/api/webhooks/blindpay",
      webhookSecret: SECRET,
      messageId: "evt_replay_42",
      timestamp: 1700000000,
    });

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("http://localhost:4000/api/webhooks/blindpay");

    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["svix-id"]).toBe("evt_replay_42");
    expect(headers["svix-timestamp"]).toBe("1700000000");
    expect(headers["svix-signature"]).toMatch(/^v1,/);
    expect(headers["content-type"]).toBe("application/json");
    expect(typeof calls[0]!.init.body).toBe("string");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual(FIXTURE);
  });

  it("autofills messageId + timestamp when omitted", async () => {
    const calls: Array<RequestInit> = [];
    globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response("OK", { status: 200 });
    }) as unknown as typeof fetch;

    await replay({
      payload: FIXTURE,
      url: "http://localhost:4000/api/webhooks/blindpay",
      webhookSecret: SECRET,
    });

    const headers = calls[0]!.headers as Record<string, string>;
    expect(headers["svix-id"]).toMatch(/^msg_replay_/);
    expect(Number(headers["svix-timestamp"])).toBeGreaterThan(0);
  });
});
