import { describe, expect, it } from "vitest";

import {
  delegatedChainFamily,
  isDelegatableChain,
} from "../lib/delegation-chains";

describe("delegatedChainFamily", () => {
  it("maps EVM to the node-evm signer", () => {
    expect(delegatedChainFamily("EVM")).toBe("EVM");
  });

  /**
   * The reason this module exists: the client SDK labels Solana wallet
   * accounts "SOL" (`WAAS_CHAINS`), the wallet servers and the webhook payload
   * label the same chain "SVM". Both reach the signer, and picking the EVM
   * branch for one of them would sign with the wrong curve.
   */
  it("maps both spellings of Solana to the node-svm signer", () => {
    expect(delegatedChainFamily("SOL")).toBe("SVM");
    expect(delegatedChainFamily("SVM")).toBe("SVM");
  });

  it("is case insensitive", () => {
    expect(delegatedChainFamily("evm")).toBe("EVM");
    expect(delegatedChainFamily("sol")).toBe("SVM");
  });

  it("returns null for chains with no delegated signer", () => {
    for (const chain of ["BTC", "SUI", "TON", "TRON", "", null, undefined]) {
      expect(delegatedChainFamily(chain)).toBeNull();
    }
  });

  it("gates the settings row on the same answer", () => {
    expect(isDelegatableChain("SOL")).toBe(true);
    expect(isDelegatableChain("BTC")).toBe(false);
  });
});
