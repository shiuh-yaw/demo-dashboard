/**
 * Magic-send credit derivation tests.
 *
 * Credits are derived: for each (user, token, chain) tuple, we count
 * the magic-send rows in non-failed states and return them as a debit
 * balance.
 */

import { describe, expect, it } from "vitest";

import { getCreditsForUser } from "../credits";
import { MAGIC_SEND_KIND } from "../intents";

import { FakeTransactionRecordService } from "./fakes";

async function seed(
  txs: FakeTransactionRecordService,
  payload: Record<string, unknown>,
  state: string = "confirmed",
): Promise<void> {
  const row = await txs.create({
    kind: MAGIC_SEND_KIND,
    payload,
    refs: {},
  });
  // Bypass state-machine helpers — tests need explicit terminal states.
  // Postgres fake stores whatever state we set via direct manipulation.
  // We piggyback on the service `updateState` for legal transitions
  // only where state allows; for tests we just write via reflection.
  // Simpler: re-create the row carrying the desired state.
  // The FakeTransactionRecordService stores `state` from input.state if
  // provided; recreate via that path.
  await txs.delete(row.id);
  await txs.create({
    kind: MAGIC_SEND_KIND,
    payload,
    refs: {},
    state: state as never,
  });
}

describe("getCreditsForUser", () => {
  it("returns an empty array when the user has no magic-send rows", async () => {
    const txs = new FakeTransactionRecordService();
    const credits = await getCreditsForUser("user-1", {
      transactionRecords: txs,
    });
    expect(credits).toEqual([]);
  });

  it("counts confirmed magic-send rows as one debit each per (token, chain)", async () => {
    const txs = new FakeTransactionRecordService();
    const USDC = "0x2222222222222222222222222222222222222222";
    await seed(txs, {
      userId: "user-1",
      token: USDC,
      chainId: 84532,
    });
    await seed(txs, {
      userId: "user-1",
      token: USDC,
      chainId: 84532,
    });

    const credits = await getCreditsForUser("user-1", {
      transactionRecords: txs,
    });
    expect(credits).toHaveLength(1);
    expect(credits[0]).toMatchObject({
      userId: "user-1",
      token: USDC,
      chainId: 84532,
      balance: "-2",
    });
  });

  it("buckets per (token, chain) tuple", async () => {
    const txs = new FakeTransactionRecordService();
    const USDC = "0x2222222222222222222222222222222222222222";
    const USDT = "0x4444444444444444444444444444444444444444";
    await seed(txs, { userId: "user-1", token: USDC, chainId: 84532 });
    await seed(txs, { userId: "user-1", token: USDT, chainId: 84532 });
    await seed(txs, { userId: "user-1", token: USDC, chainId: 8453 });

    const credits = await getCreditsForUser("user-1", {
      transactionRecords: txs,
    });
    expect(credits).toHaveLength(3);
  });

  it("ignores other users' rows", async () => {
    const txs = new FakeTransactionRecordService();
    const USDC = "0x2222222222222222222222222222222222222222";
    await seed(txs, { userId: "user-2", token: USDC, chainId: 84532 });
    const credits = await getCreditsForUser("user-1", {
      transactionRecords: txs,
    });
    expect(credits).toEqual([]);
  });

  it("does not count `failed` rows as debits", async () => {
    const txs = new FakeTransactionRecordService();
    const USDC = "0x2222222222222222222222222222222222222222";
    await seed(txs, { userId: "user-1", token: USDC, chainId: 84532 }, "failed");
    const credits = await getCreditsForUser("user-1", {
      transactionRecords: txs,
    });
    expect(credits).toEqual([]);
  });

  it("counts in-flight (submitted-transfer / submitted-userop) rows as debits", async () => {
    const txs = new FakeTransactionRecordService();
    const USDC = "0x2222222222222222222222222222222222222222";
    await seed(
      txs,
      { userId: "user-1", token: USDC, chainId: 84532 },
      "submitted-transfer",
    );
    await seed(
      txs,
      { userId: "user-1", token: USDC, chainId: 84532 },
      "submitted-userop",
    );
    const credits = await getCreditsForUser("user-1", {
      transactionRecords: txs,
    });
    expect(credits).toHaveLength(1);
    expect(credits[0].balance).toBe("-2");
  });
});
