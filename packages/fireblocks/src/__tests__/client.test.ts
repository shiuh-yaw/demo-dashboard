import { describe, expect, it } from "vitest";
import { MockFireblocksClient } from "../mock-client";

describe("FireblocksClient namespace surface", () => {
  it("MockFireblocksClient exposes the expected namespaces", () => {
    const mock = new MockFireblocksClient();
    expect(mock.vault).toBeDefined();
    expect(mock.transactions).toBeDefined();
    expect(mock.internalWallets).toBeDefined();
    expect(mock.orders).toBeDefined();
    expect(mock.compliance).toBeDefined();
    expect(mock.providers).toBeDefined();
    expect(mock.sdk).toBeDefined();
    expect(mock.api).toBeDefined();
  });

  it("vault namespace exposes the expected methods", () => {
    const mock = new MockFireblocksClient();
    expect(typeof mock.vault.createAccount).toBe("function");
    expect(typeof mock.vault.getAccount).toBe("function");
    expect(typeof mock.vault.listAccounts).toBe("function");
    expect(typeof mock.vault.hideAccount).toBe("function");
    expect(typeof mock.vault.setCustomerRefId).toBe("function");
    expect(typeof mock.vault.attachOrDetachTags).toBe("function");
    expect(typeof mock.vault.createWallet).toBe("function");
    expect(typeof mock.vault.getDepositAddresses).toBe("function");
    expect(typeof mock.vault.createDepositAddress).toBe("function");
    expect(typeof mock.vault.getAssetBalance).toBe("function");
  });

  it("transactions namespace exposes the expected methods", () => {
    const mock = new MockFireblocksClient();
    expect(typeof mock.transactions.create).toBe("function");
    expect(typeof mock.transactions.get).toBe("function");
    expect(typeof mock.transactions.getByExternalId).toBe("function");
    expect(typeof mock.transactions.list).toBe("function");
  });

  it("internalWallets namespace exposes the expected methods", () => {
    const mock = new MockFireblocksClient();
    expect(typeof mock.internalWallets.list).toBe("function");
    expect(typeof mock.internalWallets.get).toBe("function");
    expect(typeof mock.internalWallets.create).toBe("function");
    expect(typeof mock.internalWallets.createAsset).toBe("function");
  });

  it("compliance namespace exposes screenTransaction", () => {
    const mock = new MockFireblocksClient();
    expect(typeof mock.compliance.screenTransaction).toBe("function");
  });

  it("api escape hatch exposes verb methods", () => {
    const mock = new MockFireblocksClient();
    expect(typeof mock.api.get).toBe("function");
    expect(typeof mock.api.post).toBe("function");
    expect(typeof mock.api.put).toBe("function");
    expect(typeof mock.api.delete).toBe("function");
    expect(typeof mock.api.patch).toBe("function");
  });
});
