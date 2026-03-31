/**
 * Normalized Dynamic user metadata API.
 * Canonical keys and helpers for reading/writing user metadata.
 */

const DYNAMIC_API_BASE = "https://app.dynamicauth.com/api/v0";

/**
 * Dynamic REST routes are scoped by the **environment** (same ID as the client SDK).
 * Always use NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID so client and server stay aligned.
 */
function getEnvironmentId(): string {
  const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID?.trim();
  if (!envId) {
    throw new Error(
      "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required (must match createDynamicClient environmentId).",
    );
  }
  return envId;
}

/**
 * Admin API (user metadata, etc.) authenticates with a **server API token**, not the public environment ID.
 * @see https://www.dynamic.xyz/docs/developer-dashboard/api-tokens
 */
function getAdminHeaders(): HeadersInit {
  const apiKey = process.env.DYNAMIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "DYNAMIC_API_KEY is required for Dynamic admin API calls. Create an API token in the Dynamic dashboard for the same project as NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID.",
    );
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export interface DynamicWallet {
  id: string;
  name?: string;
  chain: string;
  publicKey: string;
  provider: string;
  properties?: Record<string, unknown>;
  lastSelectedAt?: string | null;
}

export interface DynamicUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  alias?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  wallets?: DynamicWallet[];
}

export type UserWithMetadata = { metadata?: Record<string, unknown> };

export const METADATA_KEYS = {
  IS_KYC_COMPLETED: "is_kyc_completed",
  WALLET_TYPE: "wallet_type",
  /** Fireblocks vault data (when wallet_type is fireblocks). Object: { vaultId, vaultAddress } */
  FIREBLOCKS: "fireblocks",
  /**
   * Deposit app: per-network Fireblocks linkage.
   * Shape: `{ "base"?: { vaultAccountId, internalWalletId, depositAddresses }, … }`.
   */
  DEPOSIT_FIREBLOCKS: "deposit_fireblocks",
} as const;

/** Deposit demo networks that map to separate Fireblocks vault metadata. */
export type DepositFireblocksNetworkKey = "base" | "base-sepolia";

const DEPOSIT_FIREBLOCKS_NETWORK_KEYS = new Set<DepositFireblocksNetworkKey>([
  "base",
  "base-sepolia",
]);

function isDepositFireblocksNetworkKey(
  value: string,
): value is DepositFireblocksNetworkKey {
  return DEPOSIT_FIREBLOCKS_NETWORK_KEYS.has(
    value as DepositFireblocksNetworkKey,
  );
}

/** Per-network deposit ↔ Fireblocks ids (vault, internal wallet, vault deposit addresses). */
export interface DepositFireblocksNetworkEntry {
  vaultAccountId?: string;
  internalWalletId?: string;
  /** Fireblocks asset id → vault deposit address for that asset. */
  depositAddresses?: Record<string, string>;
}

function parseDepositFireblocksMetadata(
  raw: unknown,
): Partial<Record<DepositFireblocksNetworkKey, DepositFireblocksNetworkEntry>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Partial<
    Record<DepositFireblocksNetworkKey, DepositFireblocksNetworkEntry>
  > = {};
  for (const [k, val] of Object.entries(raw)) {
    if (!isDepositFireblocksNetworkKey(k)) continue;
    if (val === null || typeof val !== "object" || Array.isArray(val)) continue;
    const o = val as Record<string, unknown>;
    const vaultAccountId =
      typeof o.vaultAccountId === "string" && o.vaultAccountId.trim() !== ""
        ? o.vaultAccountId.trim()
        : undefined;
    const internalWalletId =
      typeof o.internalWalletId === "string" && o.internalWalletId.trim() !== ""
        ? o.internalWalletId.trim()
        : undefined;
    let depositAddresses: Record<string, string> | undefined;
    const rawAddr = o.depositAddresses;
    if (
      rawAddr !== null &&
      typeof rawAddr === "object" &&
      !Array.isArray(rawAddr)
    ) {
      const acc: Record<string, string> = {};
      for (const [ak, av] of Object.entries(rawAddr)) {
        if (typeof av === "string" && av.trim() !== "")
          acc[ak.trim()] = av.trim();
      }
      if (Object.keys(acc).length > 0) depositAddresses = acc;
    }
    out[k] = { vaultAccountId, internalWalletId, depositAddresses };
  }
  return out;
}

export interface FireblocksMetadata {
  vaultId: string;
  vaultAddress: string;
}

/** @deprecated Use METADATA_KEYS.IS_KYC_COMPLETED. Kept for backward compatibility. */
export const KYC_APPROVED_METADATA_KEY = "kyc_approved";

/** Check if a metadata value is truthy (e.g. "true" string or boolean). */
export function isMetadataTruthy(user: UserWithMetadata, key: string): boolean {
  const value = user.metadata?.[key];
  if (typeof value === "string") return value === "true";
  return Boolean(value);
}

/**
 * Check if a user has completed KYC.
 * Supports both is_kyc_completed and kyc_approved for migration.
 */
export function isKycCompleted(user: UserWithMetadata): boolean {
  return (
    isMetadataTruthy(user, METADATA_KEYS.IS_KYC_COMPLETED) ||
    isMetadataTruthy(user, KYC_APPROVED_METADATA_KEY)
  );
}

export type WalletType = "external" | "embedded" | "fireblocks";

/**
 * Get the user's wallet type from metadata.
 */
export function getWalletType(user: UserWithMetadata): WalletType | null {
  const v = user.metadata?.[METADATA_KEYS.WALLET_TYPE];
  if (
    typeof v === "string" &&
    ["external", "embedded", "fireblocks"].includes(v)
  ) {
    return v as WalletType;
  }
  return null;
}

export function getDepositFireblocksEntry(
  user: UserWithMetadata,
  network: DepositFireblocksNetworkKey,
): DepositFireblocksNetworkEntry | undefined {
  const map = parseDepositFireblocksMetadata(
    user.metadata?.[METADATA_KEYS.DEPOSIT_FIREBLOCKS],
  );
  const e = map[network];
  if (!e) return undefined;
  const hasAddresses =
    e.depositAddresses != null && Object.keys(e.depositAddresses).length > 0;
  if (!e.vaultAccountId && !e.internalWalletId && !hasAddresses)
    return undefined;
  return e;
}

/**
 * Merge fields for one deposit network into {@link METADATA_KEYS.DEPOSIT_FIREBLOCKS}.
 * When `patch.depositAddresses` is passed, it **replaces** the stored map for that network
 * (it is not deep-merged with the previous `depositAddresses`).
 */
export async function mergeDepositFireblocksNetwork(
  userId: string,
  network: DepositFireblocksNetworkKey,
  patch: Partial<DepositFireblocksNetworkEntry>,
): Promise<void> {
  const existing = await getUser(userId);
  const full = parseDepositFireblocksMetadata(
    existing?.metadata?.[METADATA_KEYS.DEPOSIT_FIREBLOCKS],
  );
  const prevEntry = full[network] ?? {};
  const { depositAddresses: nextDeposits, ...patchRest } = patch;
  const nextEntry: DepositFireblocksNetworkEntry = {
    ...prevEntry,
    ...patchRest,
  };
  if (nextDeposits !== undefined) {
    nextEntry.depositAddresses =
      Object.keys(nextDeposits).length > 0 ? { ...nextDeposits } : undefined;
  }
  const next = { ...full, [network]: nextEntry };
  await updateUserMetadata(userId, {
    [METADATA_KEYS.DEPOSIT_FIREBLOCKS]: next,
  });
}

/**
 * Get a user by ID.
 */
export async function getUser(userId: string): Promise<DynamicUser | null> {
  const envId = getEnvironmentId();
  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/users/${userId}`,
    { headers: getAdminHeaders() },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dynamic API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.user ?? null;
}

/**
 * Get all wallets for a user.
 * @see https://www.dynamic.xyz/docs/api-reference/wallets/get-wallets-by-user
 */
export async function getUserWallets(userId: string): Promise<DynamicWallet[]> {
  const envId = getEnvironmentId();
  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/users/${userId}/wallets`,
    { headers: getAdminHeaders() },
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dynamic API wallets error: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { wallets?: DynamicWallet[] };
  return data.wallets ?? [];
}

const METADATA_MAX_BYTES = 2000; // Dynamic metadata limit ~2KB

/**
 * Sanitize metadata for Dynamic API: ensure JSON-serializable, stay under size limit.
 * Truncates long strings in nested structures to avoid 500 errors.
 */
function sanitizeMetadataForDynamic(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    result[key] = sanitizeValue(value);
  }
  const json = JSON.stringify(result);
  const byteLength = new TextEncoder().encode(json).length;
  if (byteLength > METADATA_MAX_BYTES) {
    throw new Error(
      `Metadata exceeds ${METADATA_MAX_BYTES} byte limit. Reduce stored data (e.g. fewer positions).`,
    );
  }
  return result;
}

const MAX_STRING_LENGTH = 200;

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string")
    return value.length > MAX_STRING_LENGTH
      ? value.slice(0, MAX_STRING_LENGTH)
      : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = sanitizeValue(v);
    }
    return out;
  }
  return null;
}

/**
 * Update a user's metadata via the backend API.
 * Merges with existing metadata to avoid overwriting other keys.
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const envId = getEnvironmentId();
  const existing = await getUser(userId);
  const merged = {
    ...(existing?.metadata ?? {}),
    ...metadata,
  } as Record<string, unknown>;

  const sanitized = sanitizeMetadataForDynamic(merged);

  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/users/${userId}`,
    {
      method: "PUT",
      headers: getAdminHeaders(),
      body: JSON.stringify({ metadata: sanitized }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dynamic API update user error: ${res.status} ${text}`);
  }
}

/**
 * Set KYC completed for a user.
 */
export async function setKycCompleted(userId: string): Promise<void> {
  await updateUserMetadata(userId, {
    [METADATA_KEYS.IS_KYC_COMPLETED]: "true",
    [KYC_APPROVED_METADATA_KEY]: "true",
  });
}

/**
 * Clear KYC status for a user (for demo reset).
 */
export async function clearKycCompleted(userId: string): Promise<void> {
  await updateUserMetadata(userId, {
    [METADATA_KEYS.IS_KYC_COMPLETED]: "false",
    [KYC_APPROVED_METADATA_KEY]: "false",
  });
}

/**
 * Set wallet type for a user.
 */
export async function setWalletType(
  userId: string,
  type: WalletType,
): Promise<void> {
  await updateUserMetadata(userId, { [METADATA_KEYS.WALLET_TYPE]: type });
}

/**
 * Clear wallet type for a user (for demo reset).
 * User will see wallet selection screen again.
 */
export async function clearWalletType(userId: string): Promise<void> {
  await updateUserMetadata(userId, { [METADATA_KEYS.WALLET_TYPE]: "" });
}

/**
 * Remove a metadata key from a user.
 * Fetches existing metadata, omits the key, and PUTs the result.
 */
export async function removeMetadataKey(
  userId: string,
  key: string,
): Promise<void> {
  const envId = getEnvironmentId();
  const existing = await getUser(userId);
  const merged = { ...(existing?.metadata ?? {}) } as Record<string, unknown>;
  delete merged[key];

  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/users/${userId}`,
    {
      method: "PUT",
      headers: getAdminHeaders(),
      body: JSON.stringify({ metadata: merged }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dynamic API remove metadata error: ${res.status} ${text}`);
  }
}

/**
 * Clear all metadata for a user (for demo reset).
 * Replaces metadata with empty object.
 */
export async function clearAllMetadata(userId: string): Promise<void> {
  const envId = getEnvironmentId();
  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/users/${userId}`,
    {
      method: "PUT",
      headers: getAdminHeaders(),
      body: JSON.stringify({ metadata: {} }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dynamic API clear metadata error: ${res.status} ${text}`);
  }
}
