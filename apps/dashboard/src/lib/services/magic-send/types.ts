/**
 * Magic-send primitive — types.
 *
 * Magic-send moves USDC (or any ERC-20) from a custodial vault to the
 * user's Dynamic embedded wallet, then dispatches a gas-sponsored
 * userop from the embedded wallet to an arbitrary on-chain destination.
 *
 * The primitive is destination-agnostic: consumers compose the
 * destination `MagicSendCall[]` themselves (per `project_magic_send_primitive`).
 * No per-protocol packages (Aave, Morpho, etc.) live here.
 *
 * Two transactions get persisted as a single state-machine row of
 * `kind = "magic-send"` (see `@dynamic-demos/transactions` state graph,
 * Phase 7 sub-states):
 *
 *   initialized → submitted-transfer → transfer-confirmed
 *               → submitted-userop → confirmed
 *
 * Hex addresses are lowercased before persistence so Redis pending
 * lookups by `to` address are exact. Callers are expected to feed
 * checksummed addresses; the service handles normalization.
 */

import type { TransactionState } from "@dynamic-demos/transactions";

/** 0x-prefixed lowercase hex string. The service normalizes on write. */
export type HexAddress = `0x${string}`;

/** Subset of TransactionState reachable by a magic-send transaction. */
export type MagicSendStatus = Extract<
  TransactionState,
  | "initialized"
  | "submitted-transfer"
  | "transfer-confirmed"
  | "submitted-userop"
  | "confirmed"
  | "failed"
  | "cancelled"
>;

/**
 * One call in the destination userop. Mirrors `BatchCall` from
 * `@dynamic-labs-sdk/zerodev`, but typed locally so the service
 * layer doesn't drag the ZeroDev SDK into Node-only test paths.
 * `value` is a decimal string so it survives JSON round-trips
 * (bigints aren't JSON-safe).
 */
export interface MagicSendCall {
  /** Recipient contract / EOA. */
  to: HexAddress;
  /** Hex calldata. Optional — bare ETH-value sends omit it. */
  data?: `0x${string}`;
  /** wei value as decimal string. "0" for pure calldata sends. */
  value: string;
}

/**
 * The intent the user signs in the browser. Carries everything the
 * dashboard needs to fund the embedded wallet and dispatch the userop
 * once the funding leg confirms.
 *
 * `recipient` is the user's embedded wallet (vault transfer target).
 * `calls` is what the embedded wallet executes on the user's behalf.
 *
 * `idempotencyKey` is a client-supplied dedup token (e.g. uuidv4)
 * scoped per intent submission; the dashboard rejects repeats inside
 * the dedup window.
 */
export interface MagicSendIntent {
  /** Stable dashboard-issued id. */
  id: string;
  /** Dynamic user id (`sub` from the verified JWT). */
  userId: string;
  /** Demo instance this intent belongs to (for credit accounting). */
  demoInstanceId: string;
  /** ID of the vault wallet to draw from. */
  vaultId: string;
  /** User's Dynamic embedded wallet address. Lowercased. */
  recipient: HexAddress;
  /** ERC-20 token contract to transfer. Lowercased. */
  token: HexAddress;
  /** Token amount (smallest unit, decimal string for JSON safety). */
  amount: string;
  /** Chain id (numeric, e.g. 84532 = Base Sepolia). */
  chainId: number;
  /** Destination calls executed by the embedded wallet via userop. */
  calls: MagicSendCall[];
  /** Caller-supplied idempotency token. */
  idempotencyKey: string;
  /** Current canonical state. */
  state: MagicSendStatus;
  /** Vault → embedded-wallet ERC-20 transfer tx hash, once submitted. */
  transferTxHash?: `0x${string}`;
  /** Userop bundle hash, once submitted. */
  useropBundleHash?: `0x${string}`;
  /** Webhook event id that triggered userop dispatch, when applicable. */
  webhookEventId?: string;
  /** Optional human-readable failure reason on terminal failure. */
  failureReason?: string;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** Input accepted by `createIntent`. Recipient/token are checksum-tolerant. */
export interface CreateMagicSendIntentInput {
  userId: string;
  demoInstanceId: string;
  vaultId: string;
  recipient: string;
  token: string;
  amount: string;
  chainId: number;
  calls: MagicSendCall[];
  idempotencyKey: string;
}

/**
 * Redis-pending payload — what the webhook receiver consults to match
 * an inbound `wallet.activity` transfer to a known intent.
 */
export interface PendingIntent {
  intentId: string;
  expectedAmount: string;
  expectedToken: HexAddress;
  idempotencyKey: string;
}

/** Vault adapter contract. Implementations submit the funding leg. */
export interface VaultTransferRequest {
  vaultId: string;
  token: HexAddress;
  recipient: HexAddress;
  amount: string;
  chainId: number;
}

export interface VaultTransferResult {
  /** On-chain transaction hash of the ERC-20 transfer. */
  txHash: `0x${string}`;
}

export interface VaultAdapter {
  /**
   * Submit a vault → recipient ERC-20 transfer. Implementations are
   * responsible for nonce handling and signing. Returns the tx hash
   * immediately; the caller waits for the on-chain confirmation via
   * Dynamic's webhook (not via this adapter).
   */
  transfer(req: VaultTransferRequest): Promise<VaultTransferResult>;
}

/**
 * Userop dispatcher contract. Implementations submit the destination
 * userop on behalf of the user's embedded wallet.
 *
 * NOTE (Phase 7 deviation): the upstream `@dynamic-labs-sdk/zerodev`
 * `sendUserOperation` requires either a client-side `EvmWalletAccount`
 * or a `KernelClient` derived from one. Both are constructed in the
 * browser via the Dynamic SDK; the server cannot mint one. Phase 7
 * ships the orchestration via this interface so the actual dispatch
 * implementation (client-side relay, session-key flow, or a future
 * server-callable SDK surface) lands in a follow-up PR. The default
 * implementation in production is a no-op that records the dispatch
 * intent and lets the client poll for completion.
 */
export interface UserOpExecutorRequest {
  intent: MagicSendIntent;
}

export interface UserOpExecutorResult {
  /** Bundle / userop hash for status polling. */
  bundleHash: `0x${string}`;
}

export interface UserOpExecutor {
  send(req: UserOpExecutorRequest): Promise<UserOpExecutorResult>;
}

/**
 * Credit balance derived from the user's magic-send transaction
 * history. `confirmed` magic-send rows decrement; explicit `credit`
 * adjustments increment.
 */
export interface CreditBalance {
  userId: string;
  /** Decimal string in smallest token unit (e.g. USDC 6dp). */
  balance: string;
  /** Token contract — credits are per-token. */
  token: HexAddress;
  /** Chain id the balance applies to. */
  chainId: number;
}
