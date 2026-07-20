import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getShareContext } from "../src/context";

const ORIGINAL_TRACK_URL = process.env.NEXT_PUBLIC_TRACK_URL;

describe("getShareContext", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TRACK_URL = "https://track.example.com";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_TRACK_URL = ORIGINAL_TRACK_URL;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("resolves {} when no token is given", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getShareContext(undefined);
    expect(result).toEqual({});
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves {} when NEXT_PUBLIC_TRACK_URL is unset", async () => {
    delete process.env.NEXT_PUBLIC_TRACK_URL;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getShareContext("tok_123");
    expect(result).toEqual({});
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches the context endpoint and returns prospectName + cta", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        prospectName: "Acme Corp",
        cta: { label: "Book a call", url: "https://cal.example.com/se" },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await getShareContext("tok_123");
    expect(result).toEqual({
      prospectName: "Acme Corp",
      cta: { label: "Book a call", url: "https://cal.example.com/se" },
    });
    const [url] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(
      "https://track.example.com/api/track/context?token=tok_123",
    );
  });

  it("resolves {} on a non-200 response", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getShareContext("tok_123");
    expect(result).toEqual({});
  });

  it("resolves {} when fetch rejects (network error)", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getShareContext("tok_123");
    expect(result).toEqual({});
  });

  it("resolves {} when fetch throws synchronously", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("boom");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getShareContext("tok_123");
    expect(result).toEqual({});
  });

  it("resolves {} on invalid JSON", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("invalid json");
      },
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getShareContext("tok_123");
    expect(result).toEqual({});
  });

  it("resolves {} when the response times out", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(
      (_url: string, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const promise = getShareContext("tok_123");
    await vi.advanceTimersByTimeAsync(3000);
    const result = await promise;
    expect(result).toEqual({});
    vi.useRealTimers();
  });

  it("drops a malformed cta shape", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cta: { label: "Missing url" } }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getShareContext("tok_123");
    expect(result).toEqual({});
  });
});
