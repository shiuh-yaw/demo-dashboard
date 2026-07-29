import { describe, expect, it, vi } from "vitest";

import type { RainRequester } from "../client";
import {
  createUserApplication,
  transactions,
  userWithdrawalSignature,
} from "../methods";

function stubClient(overrides: Partial<RainRequester>): RainRequester {
  return {
    get: vi.fn(),
    post: vi.fn(),
    ...overrides,
  } as RainRequester;
}

describe("rain methods", () => {
  it("createUserApplication POSTs the application endpoint", async () => {
    const post = vi.fn().mockResolvedValue({ id: "app_1" });
    const client = stubClient({ post });

    await createUserApplication(client, { firstName: "A" } as never);

    expect(post).toHaveBeenCalledWith(
      "/v1/issuing/applications/user",
      { firstName: "A" },
    );
  });

  it("transactions builds a query string from provided params only", async () => {
    const get = vi.fn().mockResolvedValue([]);
    const client = stubClient({ get });

    await transactions(client, { userId: "u1", limit: 5 });

    expect(get).toHaveBeenCalledWith(
      "/v1/issuing/transactions?userId=u1&limit=5",
    );
  });

  it("transactions omits the query string when no params are given", async () => {
    const get = vi.fn().mockResolvedValue([]);
    const client = stubClient({ get });

    await transactions(client);

    expect(get).toHaveBeenCalledWith("/v1/issuing/transactions");
  });

  it("userWithdrawalSignature retries while pending then returns ready", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ status: "pending", retryAfter: 1 })
      .mockResolvedValueOnce({ status: "ready", signature: { data: "d", salt: "s" } });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = stubClient({ get });

    const result = await userWithdrawalSignature(
      client,
      "u1",
      {
        chainId: 1,
        token: "0xToken",
        amount: "10",
        adminAddress: "0xAdmin",
        recipientAddress: "0xRecipient",
      },
      { sleep },
    );

    expect(result.status).toBe("ready");
    expect(get).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("userWithdrawalSignature throws when maxRetries is exhausted", async () => {
    const get = vi.fn().mockResolvedValue({ status: "pending", retryAfter: 0 });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = stubClient({ get });

    await expect(
      userWithdrawalSignature(
        client,
        "u1",
        {
          chainId: 1,
          token: "0xToken",
          amount: "10",
          adminAddress: "0xAdmin",
          recipientAddress: "0xRecipient",
        },
        { maxRetries: 2, sleep },
      ),
    ).rejects.toThrow("Maximum retry attempts reached");
  });
});
