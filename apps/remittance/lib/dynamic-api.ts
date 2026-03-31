/**
 * Dynamic REST API Helper
 *
 * Server-side helper for Dynamic admin operations.
 * Uses DYNAMIC_API_KEY for authentication.
 */

const DYNAMIC_API_BASE = "https://app.dynamicauth.com/api/v0";

function getEnvironmentId(): string {
  const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID?.trim();
  if (!envId) {
    throw new Error(
      "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required (must match createDynamicClient environmentId).",
    );
  }
  return envId;
}

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

export interface DynamicUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  alias?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  wallets?: Array<{
    id: string;
    publicKey: string;
    chain: string;
    walletProvider: string;
  }>;
}

/**
 * List users, optionally filtered by email.
 * Without a query, returns the most recent users.
 */
export async function listUsers(query?: string): Promise<DynamicUser[]> {
  const envId = getEnvironmentId();
  const params = new URLSearchParams();
  if (query) params.set("filter.email", query);
  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/users?${params.toString()}`,
    { headers: getAdminHeaders() },
  );

  if (!res.ok) {
    throw new Error(`Dynamic API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.users ?? [];
}

/**
 * Create a WaaS wallet for a user by email or userId.
 * Uses the WaaS create API.
 */
export async function createPregenWallet(params: {
  type: "EVM";
  email?: string;
  userId?: string;
}): Promise<{ address: string; id: string; userId?: string }> {
  const envId = getEnvironmentId();
  const identifier = params.userId ?? params.email;
  const type = params.userId ? "id" : "email";

  if (!identifier) {
    throw new Error("email or userId is required");
  }

  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/waas/create`,
    {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({
        identifier,
        type,
        chains: ["EVM"],
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dynamic API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const user = data?.user as Record<string, unknown> | undefined;
  const wallets = (user?.wallets ?? data?.wallets) as
    | Array<{ address?: string; publicKey?: string; id?: string }>
    | undefined;
  const firstWallet = Array.isArray(wallets) ? wallets[0] : undefined;
  const address =
    data?.address ??
    data?.publicKey ??
    user?.walletPublicKey ??
    user?.wallet ??
    firstWallet?.address ??
    firstWallet?.publicKey ??
    data?.wallet?.address ??
    data?.wallet?.publicKey;
  const id =
    data?.id ?? firstWallet?.id ?? data?.wallet?.id ?? data?.wallets?.[0]?.id;
  const userId = (data?.userId ??
    user?.id ??
    data?.user?.id ??
    data?.user?.userId) as string | undefined;

  if (!address) {
    throw new Error("Dynamic API did not return wallet address");
  }

  return {
    address: typeof address === "string" ? address : String(address),
    id: id ?? "",
    userId: userId ?? undefined,
  };
}

/**
 * Get a user by ID.
 * @see https://www.dynamic.xyz/docs/api-reference/users/get-a-user-by-id
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
 * Delete a user by ID.
 * @see https://docs.dynamic.xyz/api-reference/users/delete-user
 */
export async function deleteUser(userId: string): Promise<void> {
  const envId = getEnvironmentId();
  const res = await fetch(
    `${DYNAMIC_API_BASE}/environments/${envId}/users/${userId}`,
    { method: "DELETE", headers: getAdminHeaders() },
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Dynamic API delete user error: ${res.status} ${text}`);
  }
}

/** Metadata key for the Fireblocks vault address. */
export const FIREBLOCKS_VAULT_METADATA_KEY = "fireblocks_vault_address";

/** Metadata key for the Fireblocks vault ID. */
export const FIREBLOCKS_VAULT_ID_METADATA_KEY = "fireblocks_vault_id";

/** Metadata key for KYC approval status (no PII - status only). */
export const KYC_APPROVED_METADATA_KEY = "kyc_approved";

/** Metadata key for bank details submitted (flag only; no PII stored). */
export const BANK_DETAILS_SUBMITTED_METADATA_KEY = "bank_details_submitted";

/** Metadata key for known recipient emails (array of strings). */
export const KNOWN_RECIPIENTS_METADATA_KEY = "known_recipients";

/** Metadata key for stub stablecoin debit card (cardNumber, expiry). */
export const STUB_CARD_METADATA_KEY = "stub_card";

/** Metadata key for total card deposits (number). Balance = sum of deposits, starts at 0. */
export const CARD_DEPOSITS_METADATA_KEY = "card_deposits_total";
export const SAVE_DEPOSITS_METADATA_KEY = "save_deposits_total";

/**
 * Update a user's metadata via the backend API.
 * Merges with existing metadata to avoid overwriting other keys.
 * @see https://www.dynamic.xyz/docs/users/information-capture
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
    throw new Error(`Dynamic API update user error: ${res.status} ${text}`);
  }
}

/**
 * Remove a metadata key from a user.
 * Fetches existing metadata, omits the key, and PUTs the result.
 */
export async function removeUserMetadataKey(
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
