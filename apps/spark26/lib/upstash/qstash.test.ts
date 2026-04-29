import { describe, it, expect, vi, beforeEach } from "vitest";

const publishJSON = vi.fn();
const mockEnv: { QSTASH_TOKEN: string | undefined } = { QSTASH_TOKEN: undefined };

vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("@upstash/qstash", () => ({
  Client: class {
    constructor(public opts: { token: string }) {}
    publishJSON = publishJSON;
  },
}));

beforeEach(() => {
  publishJSON.mockReset();
  mockEnv.QSTASH_TOKEN = undefined;
  vi.resetModules();
});

describe("enqueueCventPostback", () => {
  it("publishes via QStash when QSTASH_TOKEN is configured", async () => {
    mockEnv.QSTASH_TOKEN = "qs-test-token";
    publishJSON.mockResolvedValue({});

    const { enqueueCventPostback } = await import("./qstash.js");
    await enqueueCventPostback("http://localhost:4010", "ABC");

    expect(publishJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://localhost:4010/api/internal/worker",
        body: { confirmation: "ABC" },
      })
    );
  });

  it("logs a warning and returns when QStash is unconfigured", async () => {
    mockEnv.QSTASH_TOKEN = undefined;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const { enqueueCventPostback } = await import("./qstash.js");
    await enqueueCventPostback("http://localhost:4010", "ABC");

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ABC"));

    warn.mockRestore();
    info.mockRestore();
  });

  it("does not throw when QStash publish rejects (fire-and-forget)", async () => {
    mockEnv.QSTASH_TOKEN = "qs-test-token";
    publishJSON.mockRejectedValue(new Error("invalid token"));

    const { enqueueCventPostback } = await import("./qstash.js");
    await expect(
      enqueueCventPostback("http://x", "ABC")
    ).resolves.toBeUndefined();
  });

  it("treats empty-string QSTASH_TOKEN as unconfigured and skips publish", async () => {
    mockEnv.QSTASH_TOKEN = "";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const { enqueueCventPostback } = await import("./qstash.js");
    await enqueueCventPostback("http://x", "ABC");

    expect(publishJSON).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ABC"));

    warn.mockRestore();
    info.mockRestore();
  });
});
