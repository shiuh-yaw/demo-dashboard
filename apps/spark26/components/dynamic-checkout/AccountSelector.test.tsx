import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { AccountSelector, formatAccountLabel } from "./AccountSelector";

function makeAccount(args: {
  id: string;
  address: string;
  chain?: string;
}): WalletAccount {
  return {
    address: args.address,
    chain: (args.chain ?? "EVM") as WalletAccount["chain"],
    id: args.id,
    lastSelectedAt: null,
    verifiedCredentialId: null,
    walletProviderKey: "metamaskevm",
  } as WalletAccount;
}

describe("AccountSelector", () => {
  const acctA = makeAccount({
    id: "a",
    address: "0x9C04AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAe8E7",
  });
  const acctB = makeAccount({
    id: "b",
    address: "0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF",
    chain: "EVM",
  });

  it("returns null when only one account is connected", () => {
    // Render the component and assert it produced nothing (null → empty string
    // from renderToString). We avoid full DOM testing since vitest runs in the
    // node environment; this is the same shape used by NetworkSelector.test.
    const output = renderToString(
      <AccountSelector
        accounts={[acctA]}
        selected={acctA}
        onSelect={vi.fn()}
      />,
    );
    expect(output).toBe("");
  });

  it("renders a <select> with one option per account when more than one is connected", () => {
    const output = renderToString(
      <AccountSelector
        accounts={[acctA, acctB]}
        selected={acctA}
        onSelect={vi.fn()}
      />,
    );
    expect(output).toContain("<select");
    expect(output).toContain('aria-label="Account"');
    // Two options, one per account. Count <option occurrences.
    const optionCount = (output.match(/<option /g) ?? []).length;
    expect(optionCount).toBe(2);
    // Labels contain the short-address format used throughout the checkout.
    expect(output).toContain(formatAccountLabel(acctA));
    expect(output).toContain(formatAccountLabel(acctB));
  });
});

describe("formatAccountLabel", () => {
  it("formats as first6…last4 (chain)", () => {
    const account = makeAccount({
      id: "a",
      address: "0x9C04AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAe8E7",
      chain: "EVM",
    });
    expect(formatAccountLabel(account)).toBe("0x9C04…e8E7 (EVM)");
  });
});
