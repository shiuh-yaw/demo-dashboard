/**
 * Client-side Dynamic SDK singleton factory + SSR-safe wrapper helpers.
 *
 * Promotes the boilerplate that was previously duplicated char-for-char across
 * apps/wallet, apps/deposit, apps/proceeds (and partially in apps/checkouts and
 * apps/shop).
 *
 * The Dynamic JS SDK is a *client* singleton — `createDynamicClient` mutates
 * module-level state in `@dynamic-labs-sdk/client`. That means:
 *
 *   1. There must be exactly one call per browser page.
 *   2. SSR (Node) must skip creation — the SDK touches `window`.
 *   3. Repeated `import "@/lib/dynamic"` side-effect calls must not re-create.
 *
 * This factory encapsulates the lazy/idempotent guard so apps can declare:
 *
 *   const { getClient } = createDynamicClientSingleton<MyClient>({
 *     create: () => createDynamicClient({ environmentId, metadata, ... }),
 *     extend: (c) => { addEvmExtension(c); addSolanaExtension(c); },
 *   });
 *
 * The factory does NOT pin a specific `@dynamic-labs-sdk/client` version —
 * apps own SDK versions. The generic `T` is whatever the SDK returns.
 *
 * Sandbox-by-default still applies via `resolveCredentials` (D-005), which
 * apps thread into the `create` callback's `environmentId` argument.
 */

export interface DynamicClientSingletonAPI<T> {
  /**
   * Get-or-create the singleton. Returns null on the server (SSR).
   * Safe to call repeatedly; subsequent calls return the same instance.
   */
  getClient: () => T | null;
  /**
   * Reset the singleton. Test-only — production code never calls this.
   * Useful for unit tests that need a fresh instance per case.
   */
  __resetForTests: () => void;
}

export interface CreateDynamicClientSingletonOptions<T> {
  /** Create the underlying SDK client. Called exactly once per browser page. */
  create: () => T;
  /**
   * Optional synchronous extension hook called immediately after `create`.
   * Use for `addEvmExtension`, `addSolanaExtension`, etc.
   * Async extensions (e.g. `addWalletConnectEvmExtension`) should be invoked
   * fire-and-forget here; the SDK handles readiness internally.
   */
  extend?: (client: T) => void;
}

/**
 * Build a lazy, SSR-safe singleton for a Dynamic SDK client.
 *
 * @example
 * ```ts
 * import { createDynamicClient } from "@dynamic-labs-sdk/client";
 * import { addEvmExtension } from "@dynamic-labs-sdk/evm";
 * import { createDynamicClientSingleton } from "@dynamic-demos/dynamic/client-singleton";
 * import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";
 *
 * const { getClient } = createDynamicClientSingleton({
 *   create: () => {
 *     const { environmentId } = resolveCredentials();
 *     return createDynamicClient({ environmentId, autoInitialize: true });
 *   },
 *   extend: (client) => addEvmExtension(client),
 * });
 *
 * export { getClient };
 * ```
 */
export function createDynamicClientSingleton<T>(
  options: CreateDynamicClientSingletonOptions<T>,
): DynamicClientSingletonAPI<T> {
  let instance: T | null = null;

  const getClient = (): T | null => {
    if (typeof window === "undefined") return null;
    if (!instance) {
      instance = options.create();
      options.extend?.(instance);
    }
    return instance;
  };

  const __resetForTests = (): void => {
    instance = null;
  };

  return { getClient, __resetForTests };
}

/**
 * Wrap a synchronous SDK function with an SSR / not-initialized guard.
 *
 * Returns `fallback` when:
 *   - Running on the server (`getClient()` returns null).
 *   - The SDK function throws (defensive — common for SDK functions called
 *     before the client finishes its initial load).
 *
 * @example
 * ```ts
 * import { isSignedIn as sdkIsSignedIn } from "@dynamic-labs-sdk/client";
 * export const isSignedIn = createSafeWrapper(getClient, sdkIsSignedIn, false);
 * ```
 */
export function createSafeWrapper<TClient, TResult>(
  getClient: () => TClient | null,
  fn: () => TResult,
  fallback: TResult,
): () => TResult {
  return () => {
    const client = getClient();
    if (!client) return fallback;
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
}

/**
 * Wrap an async SDK function with an SSR / not-initialized guard.
 *
 * Throws "Dynamic client not initialized" when called before the singleton is
 * ready. Use this for operations that *require* a live client (sending
 * transactions, switching networks). For optional reads, prefer
 * {@link createSafeWrapper} with a fallback value.
 *
 * @example
 * ```ts
 * import { switchActiveNetwork as sdkSwitchActiveNetwork } from "@dynamic-labs-sdk/client";
 * export const switchActiveNetwork = createAsyncSafeWrapper(
 *   getClient,
 *   sdkSwitchActiveNetwork,
 * );
 * ```
 */
export function createAsyncSafeWrapper<
  TClient,
  TArgs extends unknown[],
  TResult,
>(
  getClient: () => TClient | null,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const client = getClient();
    if (!client) throw new Error("Dynamic client not initialized");
    return fn(...args);
  };
}
