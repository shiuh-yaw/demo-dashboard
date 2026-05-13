/**
 * Magic-send — intent service.
 *
 * Three responsibilities:
 *
 *   1. `createIntent`  — validate input, dedup on idempotency key, write
 *                        a Postgres `Transaction` row of `kind = "magic-send"`,
 *                        stash a Redis pending entry keyed by the recipient
 *                        address, and kick off the vault transfer leg.
 *
 *   2. `getIntent` / `listIntentsForUser` — read-side projections that
 *                        rebuild a `MagicSendIntent` from the Postgres row.
 *
 *   3. `executeIntent` — called by the Dynamic webhook receiver after
 *                        the transfer leg confirms. Transitions the row
 *                        through `transfer-confirmed → submitted-userop`,
 *                        dispatches via the injected `UserOpExecutor`,
 *                        and lands on `confirmed` (or `failed`).
 *
 * Storage split (D-015):
 *   - Postgres `Transaction` row is the durable record.
 *   - Redis pending entries are transient (TTL 5 min) and exist only to
 *     turn O(N transactions) webhook lookups into O(1) by-recipient.
 *   - Redis idempotency entries are short-lived dedup tokens.
 *
 * All addresses are lowercased before persistence so equality checks
 * are exact. Callers are free to pass checksummed input.
 */

import { createId } from "@paralleldrive/cuid2";

import {
  IllegalTransitionError,
  confirm,
  confirmTransfer,
  fail,
  submitTransfer,
  submitUserop,
  type TransactionState,
} from "@dynamic-demos/transactions";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type {
  TransactionRecord,
  TransactionRecordService,
} from "@/lib/services/types";

import type {
  CreateMagicSendIntentInput,
  HexAddress,
  MagicSendCall,
  MagicSendIntent,
  MagicSendStatus,
  PendingIntent,
  UserOpExecutor,
  VaultAdapter,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAGIC_SEND_KIND = "magic-send" as const;

/** Redis pending key TTL — 5 minutes is the Dynamic transfer SLA. */
export const PENDING_TTL_SECONDS = 5 * 60;

/** Redis idempotency token TTL — 1h is enough to collapse retries. */
export const IDEMPOTENCY_TTL_SECONDS = 60 * 60;

/** Magic-send statuses that are reachable from the lifecycle. */
const MAGIC_SEND_STATUSES: ReadonlySet<MagicSendStatus> = new Set<
  MagicSendStatus
>([
  "initialized",
  "submitted-transfer",
  "transfer-confirmed",
  "submitted-userop",
  "confirmed",
  "failed",
  "cancelled",
]);

// ---------------------------------------------------------------------------
// Redis surface
// ---------------------------------------------------------------------------

/**
 * Loose SETNX-capable client. Production passes the `WebhookDedupClient`
 * from `lib/webhooks/redis-client.ts`; tests inject an in-memory fake.
 * Kept narrow so the service doesn't depend on `ioredis` / `@upstash/redis`.
 */
export interface MagicSendRedisClient {
  set(
    key: string,
    value: string,
    options?: { nx?: boolean; ex?: number },
  ): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}

export const REDIS_KEY_PREFIX = "magic-send" as const;

export function pendingIntentKey(recipientLowercase: string): string {
  return `${REDIS_KEY_PREFIX}:intent:pending:${recipientLowercase}`;
}

export function idempotencyKey(token: string): string {
  return `${REDIS_KEY_PREFIX}:idempotency:${token}`;
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface MagicSendServiceDeps {
  transactionRecords: TransactionRecordService;
  redis: MagicSendRedisClient;
  vault: VaultAdapter;
  userOpExecutor: UserOpExecutor;
  /**
   * Optional clock for deterministic tests. Defaults to `Date.now()`.
   */
  clock?: () => Date;
  /** Logger. Defaults to `console`. */
  logger?: {
    info: (line: string) => void;
    error: (line: string, err?: unknown) => void;
  };
}

export class MagicSendIntentService {
  private readonly deps: MagicSendServiceDeps;

  constructor(deps: MagicSendServiceDeps) {
    this.deps = deps;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async createIntent(
    input: CreateMagicSendIntentInput,
  ): Promise<MagicSendIntent> {
    const recipient = normalizeAddress(input.recipient);
    const token = normalizeAddress(input.token);
    validateAmount(input.amount);
    validateChain(input.chainId);
    validateCalls(input.calls);
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new ValidationError(
        "idempotencyKey must be at least 8 chars",
        "MAGIC_SEND_BAD_IDEMPOTENCY",
      );
    }
    if (!input.userId) {
      throw new ValidationError("userId required", "MAGIC_SEND_BAD_USER");
    }
    if (!input.demoInstanceId) {
      throw new ValidationError(
        "demoInstanceId required",
        "MAGIC_SEND_BAD_DEMO",
      );
    }
    if (!input.vaultId) {
      throw new ValidationError("vaultId required", "MAGIC_SEND_BAD_VAULT");
    }

    // 1. Idempotency reservation. SETNX semantics — the first writer wins.
    const idemKey = idempotencyKey(input.idempotencyKey);
    const idemReserved = await this.deps.redis.set(idemKey, "1", {
      nx: true,
      ex: IDEMPOTENCY_TTL_SECONDS,
    });
    if (idemReserved === null) {
      // The key already exists — same idempotency token, treat as conflict
      // so the caller can re-fetch (or retry with a fresh token).
      throw new ConflictError(
        `Duplicate idempotency key: ${input.idempotencyKey}`,
        "MAGIC_SEND_DUPLICATE",
      );
    }

    // 2. Persist the Postgres Transaction row. State starts at
    //    `initialized`; we transition into `submitted-transfer` after the
    //    vault leg dispatches successfully.
    const payload: MagicSendPayload = {
      demoInstanceId: input.demoInstanceId,
      vaultId: input.vaultId,
      recipient,
      token,
      amount: input.amount,
      chainId: input.chainId,
      calls: input.calls,
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
    };

    const created = await this.deps.transactionRecords.create({
      kind: MAGIC_SEND_KIND,
      demoInstanceId: input.demoInstanceId,
      payload,
      refs: {},
    });

    // 3. Reserve the Redis pending slot. We do this BEFORE the vault
    //    transfer dispatches so an extremely fast webhook (sub-second
    //    finality on optimistic rollups) can still resolve the intent.
    const pending: PendingIntent = {
      intentId: created.id,
      expectedAmount: input.amount,
      expectedToken: token,
      idempotencyKey: input.idempotencyKey,
    };
    await this.deps.redis.set(
      pendingIntentKey(recipient),
      JSON.stringify(pending),
      { ex: PENDING_TTL_SECONDS },
    );

    // 4. Kick off the vault transfer leg. If the dispatch fails we
    //    transition the row to `failed` and surface the error — the
    //    Redis pending entry expires by itself.
    let transferTxHash: `0x${string}`;
    try {
      const result = await this.deps.vault.transfer({
        vaultId: input.vaultId,
        token,
        recipient,
        amount: input.amount,
        chainId: input.chainId,
      });
      transferTxHash = result.txHash;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await this.failRow(created.id, `vault-transfer-failed:${reason}`);
      throw err;
    }

    // 5. Advance the row state + persist the tx hash.
    const advanced = submitTransfer({ state: created.state });
    const updated = await this.deps.transactionRecords.updateState(created.id, {
      state: advanced.state,
    });
    const withHash = await this.deps.transactionRecords.updatePayload(
      updated.id,
      {
        payload,
        refs: { ...((created.refs as object | null) ?? {}), transferTxHash },
      },
    );

    return toMagicSendIntent(withHash);
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  async getIntent(id: string): Promise<MagicSendIntent | null> {
    const row = await this.deps.transactionRecords.get(id);
    if (!row || row.kind !== MAGIC_SEND_KIND) return null;
    return toMagicSendIntent(row);
  }

  async listIntentsForUser(userId: string): Promise<MagicSendIntent[]> {
    if (!userId) return [];
    const rows = await this.deps.transactionRecords.list({
      kind: MAGIC_SEND_KIND,
    });
    return rows
      .filter((r) => extractUserId(r) === userId)
      .map(toMagicSendIntent);
  }

  // -------------------------------------------------------------------------
  // Execute (called by webhook receiver)
  // -------------------------------------------------------------------------

  /**
   * Advance an intent from `submitted-transfer` to `confirmed` (or
   * `failed`). Called by the Dynamic wallet.activity webhook receiver.
   *
   * Idempotent: callers may invoke this multiple times — if the row is
   * already past `submitted-userop`, the executor short-circuits.
   *
   * `webhookEventId` is stashed onto `refs` so the audit trail links
   * the userop dispatch to the triggering Dynamic event.
   */
  async executeIntent(
    intentId: string,
    opts: { webhookEventId?: string } = {},
  ): Promise<MagicSendIntent> {
    const row = await this.deps.transactionRecords.get(intentId);
    if (!row || row.kind !== MAGIC_SEND_KIND) {
      throw new NotFoundError(
        `Magic-send intent not found: ${intentId}`,
        "MAGIC_SEND_NOT_FOUND",
      );
    }

    const intent = toMagicSendIntent(row);

    // Already in flight or terminal — nothing to do.
    if (
      intent.state === "submitted-userop" ||
      intent.state === "confirmed" ||
      intent.state === "failed" ||
      intent.state === "cancelled"
    ) {
      return intent;
    }

    // Step 1: submitted-transfer → transfer-confirmed.
    let current: TransactionRecord = row;
    if (current.state === "submitted-transfer") {
      const advanced = confirmTransfer({ state: current.state });
      current = await this.deps.transactionRecords.updateState(current.id, {
        state: advanced.state,
      });
    }

    // Step 2: transfer-confirmed → submitted-userop.
    if (current.state !== "transfer-confirmed") {
      // Defensive: someone advanced the row out from under us. Surface
      // as a normal state mismatch instead of trying to coerce.
      throw new ValidationError(
        `Cannot execute intent in state ${current.state}`,
        "MAGIC_SEND_BAD_STATE",
      );
    }
    {
      const advanced = submitUserop({ state: current.state });
      current = await this.deps.transactionRecords.updateState(current.id, {
        state: advanced.state,
      });
    }

    // Step 3: dispatch the userop.
    let bundleHash: `0x${string}`;
    try {
      const result = await this.deps.userOpExecutor.send({
        intent: toMagicSendIntent(current),
      });
      bundleHash = result.bundleHash;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await this.failRow(current.id, `userop-failed:${reason}`);
      throw err;
    }

    // Step 4: stash the bundle hash + webhook event id, then confirm.
    const refsBefore = (current.refs as Record<string, unknown> | null) ?? {};
    current = await this.deps.transactionRecords.updatePayload(current.id, {
      refs: {
        ...refsBefore,
        useropBundleHash: bundleHash,
        ...(opts.webhookEventId
          ? { dynamicWebhookEventId: opts.webhookEventId }
          : {}),
      },
    });
    const confirmed = confirm({ state: current.state });
    current = await this.deps.transactionRecords.updateState(current.id, {
      state: confirmed.state,
    });

    // Step 5: drop the Redis pending entry — webhook has been handled.
    const intentRecipient = intent.recipient;
    await this.deps.redis.del(pendingIntentKey(intentRecipient));

    return toMagicSendIntent(current);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async failRow(id: string, reason: string): Promise<void> {
    try {
      const row = await this.deps.transactionRecords.get(id);
      if (!row) return;
      // Skip if already terminal — nothing to do.
      if (
        row.state === "confirmed" ||
        row.state === "failed" ||
        row.state === "cancelled" ||
        row.state === "expired" ||
        row.state === "abandoned"
      ) {
        return;
      }

      // The canonical state machine doesn't permit `initialized →
      // failed` (initialized fails to `expired` or `cancelled`). For
      // magic-send, an `initialized` row that failed its vault
      // dispatch logically completed the submit step (we tried) but
      // didn't get a tx hash. Walk the row through the legal sequence
      // — initialized → submitted-transfer → failed — so the row
      // lands in `failed` and downstream consumers see a clear
      // terminal state.
      let currentState: TransactionState = row.state;
      if (currentState === "initialized") {
        try {
          const intermediate = submitTransfer({ state: currentState });
          await this.deps.transactionRecords.updateState(id, {
            state: intermediate.state,
          });
          currentState = intermediate.state;
        } catch (err) {
          if (!(err instanceof IllegalTransitionError)) {
            this.deps.logger?.error(
              `[magic-send] failRow intermediate-transition error id=${id}`,
              err,
            );
          }
        }
      }

      try {
        const next = fail({ state: currentState });
        await this.deps.transactionRecords.updateState(id, {
          state: next.state,
        });
      } catch (err) {
        // Illegal transition — log + drop. Don't shadow the original error.
        if (!(err instanceof IllegalTransitionError)) {
          this.deps.logger?.error(
            `[magic-send] failRow unexpected error id=${id}`,
            err,
          );
        }
      }

      // Re-read the row to merge `failureReason` onto the latest refs.
      const latest = await this.deps.transactionRecords.get(id);
      const refsBefore =
        ((latest?.refs ?? row.refs) as Record<string, unknown> | null) ?? {};
      await this.deps.transactionRecords.updatePayload(id, {
        refs: { ...refsBefore, failureReason: reason },
      });
    } catch (err) {
      this.deps.logger?.error(`[magic-send] failRow failed id=${id}`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MagicSendPayload {
  demoInstanceId: string;
  vaultId: string;
  recipient: HexAddress;
  token: HexAddress;
  amount: string;
  chainId: number;
  calls: MagicSendCall[];
  idempotencyKey: string;
  userId: string;
}

interface MagicSendRefs {
  transferTxHash?: `0x${string}`;
  useropBundleHash?: `0x${string}`;
  dynamicWebhookEventId?: string;
  failureReason?: string;
}

function normalizeAddress(input: string): HexAddress {
  if (typeof input !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(input)) {
    throw new ValidationError(
      `Invalid address: ${input}`,
      "MAGIC_SEND_BAD_ADDRESS",
    );
  }
  return input.toLowerCase() as HexAddress;
}

function validateAmount(amount: string): void {
  if (typeof amount !== "string" || !/^[0-9]+$/.test(amount) || amount === "0") {
    throw new ValidationError(
      `Invalid amount: ${amount}`,
      "MAGIC_SEND_BAD_AMOUNT",
    );
  }
}

function validateChain(chainId: number): void {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new ValidationError(
      `Invalid chainId: ${chainId}`,
      "MAGIC_SEND_BAD_CHAIN",
    );
  }
}

function validateCalls(calls: MagicSendCall[]): void {
  if (!Array.isArray(calls) || calls.length === 0) {
    throw new ValidationError(
      "calls must be a non-empty array",
      "MAGIC_SEND_BAD_CALLS",
    );
  }
  for (const c of calls) {
    if (!c || typeof c !== "object") {
      throw new ValidationError("invalid call entry", "MAGIC_SEND_BAD_CALLS");
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(c.to)) {
      throw new ValidationError(
        `invalid call.to: ${c.to}`,
        "MAGIC_SEND_BAD_CALLS",
      );
    }
    if (typeof c.value !== "string" || !/^[0-9]+$/.test(c.value)) {
      throw new ValidationError(
        `invalid call.value: ${c.value}`,
        "MAGIC_SEND_BAD_CALLS",
      );
    }
    if (c.data !== undefined && !/^0x[0-9a-fA-F]*$/.test(c.data)) {
      throw new ValidationError(
        `invalid call.data: ${c.data}`,
        "MAGIC_SEND_BAD_CALLS",
      );
    }
  }
}

function asMagicSendStatus(state: TransactionState): MagicSendStatus {
  if (!MAGIC_SEND_STATUSES.has(state as MagicSendStatus)) {
    throw new Error(
      `Magic-send row has non-magic-send state: ${state}. ` +
        `Row may be corrupted or the state machine drifted.`,
    );
  }
  return state as MagicSendStatus;
}

export function toMagicSendIntent(row: TransactionRecord): MagicSendIntent {
  const payload = (row.payload ?? {}) as Partial<MagicSendPayload>;
  const refs = (row.refs ?? {}) as MagicSendRefs;
  if (!payload.recipient || !payload.token || !payload.amount) {
    throw new Error(
      `Magic-send row ${row.id} has malformed payload — missing required fields`,
    );
  }
  return {
    id: row.id,
    userId: payload.userId ?? "",
    demoInstanceId: payload.demoInstanceId ?? row.demoInstanceId ?? "",
    vaultId: payload.vaultId ?? "",
    recipient: payload.recipient,
    token: payload.token,
    amount: payload.amount,
    chainId: payload.chainId ?? 0,
    calls: payload.calls ?? [],
    idempotencyKey: payload.idempotencyKey ?? "",
    state: asMagicSendStatus(row.state),
    transferTxHash: refs.transferTxHash,
    useropBundleHash: refs.useropBundleHash,
    webhookEventId: refs.dynamicWebhookEventId,
    failureReason: refs.failureReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function extractUserId(row: TransactionRecord): string | null {
  const payload = row.payload as { userId?: string } | null;
  return payload?.userId ?? null;
}

// ---------------------------------------------------------------------------
// Test helper — generate an id without going through Postgres. Exported
// so route handlers can pre-allocate the id for response shaping if
// needed in the future.
// ---------------------------------------------------------------------------
export function newIntentId(): string {
  return createId();
}
