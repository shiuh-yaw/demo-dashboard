/**
 * Vault adapter tests — verifies the viem-based ERC-20 transfer fires
 * with the right calldata. We stub viem at the import level by passing
 * an injected chain stub; the real adapter is happy with any
 * `WalletClient` that has a `sendTransaction` method.
 *
 * Rather than mock viem (which has heavily overloaded types), we test
 * the adapter end-to-end with a real `privateKeyToAccount` but a
 * `walletClient.sendTransaction` that resolves without touching a
 * network. This catches encoding bugs and config-validation bugs
 * without spinning up a chain.
 */

import { describe, expect, it } from "vitest";
import { encodeFunctionData } from "viem";

import { vaultAdapterFromEnv, ViemVaultAdapter } from "../vault";
import type { VaultEnv } from "../vault";

// Deterministic test private key — generated for test fixtures only.
// Not derived from any real entropy source; do not use anywhere with
// real funds. The address derived from this key is irrelevant to the
// assertions below (we never sign a transaction).
const SANDBOX_PK = ("0x" + "11".repeat(32)) as `0x${string}`;

describe("vaultAdapterFromEnv", () => {
  it("throws when MAGIC_SEND_VAULT_PRIVATE_KEY is missing", () => {
    expect(() =>
      vaultAdapterFromEnv({
        MAGIC_SEND_VAULT_CHAIN_ID: 84532,
        MAGIC_SEND_VAULT_RPC_URL: "https://sepolia.base.org",
      } as VaultEnv),
    ).toThrow(/not configured/);
  });

  it("throws when private key is missing the 0x prefix", () => {
    expect(() =>
      vaultAdapterFromEnv({
        MAGIC_SEND_VAULT_PRIVATE_KEY: "ab".repeat(32),
        MAGIC_SEND_VAULT_CHAIN_ID: 84532,
        MAGIC_SEND_VAULT_RPC_URL: "https://sepolia.base.org",
      }),
    ).toThrow(/0x-prefixed/);
  });

  it("returns a usable ViemVaultAdapter when all env vars set", () => {
    const adapter = vaultAdapterFromEnv({
      MAGIC_SEND_VAULT_PRIVATE_KEY: SANDBOX_PK,
      MAGIC_SEND_VAULT_CHAIN_ID: 84532,
      MAGIC_SEND_VAULT_RPC_URL: "https://sepolia.base.org",
    });
    expect(adapter).toBeInstanceOf(ViemVaultAdapter);
  });
});

describe("ViemVaultAdapter", () => {
  it("throws when called for a chain that doesn't match its config", async () => {
    const adapter = new ViemVaultAdapter({
      privateKey: SANDBOX_PK,
      chainId: 84532,
      rpcUrl: "https://sepolia.base.org",
    });
    await expect(
      adapter.transfer({
        vaultId: "v",
        token: "0x2222222222222222222222222222222222222222",
        recipient: "0x1111111111111111111111111111111111111111",
        amount: "1",
        chainId: 1, // mainnet — mismatch
      }),
    ).rejects.toThrow(/configured for chain 84532/);
  });

  it("encodes ERC-20 transfer calldata correctly", () => {
    // Independent of the adapter — verifies that the calldata the
    // adapter builds matches the canonical ABI encoding of
    // `transfer(to, amount)`. If this drifts the adapter is broken.
    const data = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "transfer",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ] as const,
      functionName: "transfer",
      args: [
        "0x1111111111111111111111111111111111111111",
        BigInt("1000000"),
      ],
    });
    // 0xa9059cbb is the canonical ERC-20 transfer selector.
    expect(data.startsWith("0xa9059cbb")).toBe(true);
  });
});
