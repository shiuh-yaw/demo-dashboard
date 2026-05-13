/**
 * Magic-send — vault wallet adapter.
 *
 * Sandbox mode (Phase 7 ship target): a single env-configured EOA holds
 * the sandbox USDC and signs ERC-20 `transfer` calls via viem's
 * `walletClient`. The private key lives in `MAGIC_SEND_VAULT_PRIVATE_KEY`
 * — sandbox only per D-005.
 *
 * Production: Fireblocks-mediated transfer (TODO; lands in a follow-up
 * PR alongside the production credential gate). This file's job is to
 * keep the adapter surface clean so swapping in Fireblocks is a
 * constructor change, not a service-layer refactor.
 *
 * The adapter is intentionally narrow: it owns chain connectivity +
 * signing + nonce handling for the vault, nothing else. State machine
 * transitions and Redis pending entries are intent-service concerns.
 */

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import type {
  HexAddress,
  VaultAdapter,
  VaultTransferRequest,
  VaultTransferResult,
} from "./types";

/**
 * Minimal ERC-20 transfer ABI fragment. Inlined so this file doesn't
 * pull in a giant ABI bundle — viem's `encodeFunctionData` is happy
 * with a single-function ABI.
 */
const ERC20_TRANSFER_ABI = [
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
] as const;

export interface ViemVaultAdapterConfig {
  /** Private key (0x-prefixed hex) of the vault EOA. Sandbox only. */
  privateKey: Hex;
  /** Chain id the vault operates on. */
  chainId: number;
  /** RPC URL. Defaults to public Base Sepolia for chain 84532. */
  rpcUrl: string;
  /** Optional viem `Chain` override — defaults to a minimal stub. */
  chain?: Chain;
}

/**
 * Build the viem clients lazily so the adapter is cheap to construct
 * in modules that may not actually dispatch a transfer (tests, route
 * scaffolding, etc.).
 */
interface BoundClients {
  publicClient: PublicClient;
  walletClient: WalletClient<Transport, Chain, Account>;
  account: Account;
  chain: Chain;
}

/**
 * Production (sandbox) vault adapter — signs an ERC-20 `transfer`
 * with a single private key and submits it via viem.
 *
 * Per D-005 this is sandbox-by-default. Production deployments must
 * supply a different adapter (e.g. a Fireblocks-backed implementation).
 */
export class ViemVaultAdapter implements VaultAdapter {
  private readonly config: ViemVaultAdapterConfig;
  private cached: BoundClients | null = null;

  constructor(config: ViemVaultAdapterConfig) {
    this.config = config;
  }

  async transfer(req: VaultTransferRequest): Promise<VaultTransferResult> {
    if (req.chainId !== this.config.chainId) {
      throw new Error(
        `Vault is configured for chain ${this.config.chainId}, ` +
          `got transfer request for chain ${req.chainId}`,
      );
    }
    const { walletClient, account } = this.getClients();

    const data = encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [req.recipient, BigInt(req.amount)],
    });

    const txHash = await walletClient.sendTransaction({
      account,
      to: req.token,
      data,
      // BigInt(0) — tsconfig target is ES2017 in the dashboard, which
      // forbids `0n` literals. The runtime supports BigInt natively
      // (Node 18+), so the constructor form is the right escape hatch.
      value: BigInt(0),
      chain: this.getClients().chain,
    });

    return { txHash };
  }

  private getClients(): BoundClients {
    if (this.cached) return this.cached;
    const account = privateKeyToAccount(this.config.privateKey);
    const chain: Chain = this.config.chain ?? buildMinimalChain(
      this.config.chainId,
      this.config.rpcUrl,
    );
    const publicClient = createPublicClient({
      chain,
      transport: http(this.config.rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(this.config.rpcUrl),
    });
    this.cached = { publicClient, walletClient, account, chain };
    return this.cached;
  }
}

/**
 * Minimal viem-compatible `Chain` shape — avoids importing the entire
 * `viem/chains` package for a sandbox chain id. The sandbox RPC URL
 * is the only network access this needs.
 */
function buildMinimalChain(chainId: number, rpcUrl: string): Chain {
  return {
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as unknown as Chain;
}

/**
 * Build a vault adapter from env config. Throws when sandbox vars are
 * unset — callers wire this at request time so missing config surfaces
 * as a clear 500 rather than a silent crash.
 */
export interface VaultEnv {
  MAGIC_SEND_VAULT_PRIVATE_KEY?: string;
  MAGIC_SEND_VAULT_CHAIN_ID?: number;
  MAGIC_SEND_VAULT_RPC_URL?: string;
}

export function vaultAdapterFromEnv(envSource: VaultEnv): ViemVaultAdapter {
  const privateKey = envSource.MAGIC_SEND_VAULT_PRIVATE_KEY;
  const chainId = envSource.MAGIC_SEND_VAULT_CHAIN_ID;
  const rpcUrl = envSource.MAGIC_SEND_VAULT_RPC_URL;
  if (!privateKey || !chainId || !rpcUrl) {
    throw new Error(
      "Magic-send vault is not configured. Set MAGIC_SEND_VAULT_PRIVATE_KEY, " +
        "MAGIC_SEND_VAULT_CHAIN_ID, and MAGIC_SEND_VAULT_RPC_URL.",
    );
  }
  if (!privateKey.startsWith("0x")) {
    throw new Error(
      "MAGIC_SEND_VAULT_PRIVATE_KEY must be a 0x-prefixed hex string.",
    );
  }
  return new ViemVaultAdapter({
    privateKey: privateKey as Hex,
    chainId,
    rpcUrl,
  });
}

// Re-export the address type so route handlers don't have to dig
// through `./types`.
export type { HexAddress };
