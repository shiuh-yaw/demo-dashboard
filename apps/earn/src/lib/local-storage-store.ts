"use client";

/**
 * Generic localStorage store utility.
 *
 * Creates a type-safe localStorage store with:
 * - SSR-safe operations (no window access during SSR)
 * - Automatic serialization/deserialization
 * - Validation function support
 * - Reset to default functionality
 *
 * This consolidates the repeated localStorage patterns across:
 * - activity-demo-store.ts
 * - payout-demo-store.ts
 * - prepaid-card-demo-store.ts
 * - blindpay-kyc-demo-store.ts
 *
 * @example
 * ```ts
 * const counterStore = createLocalStorageStore<number>({
 *   key: "my-counter",
 *   defaultValue: () => 0,
 *   validate: (value) => typeof value === "number" && value >= 0,
 * });
 *
 * const count = counterStore.load();
 * counterStore.save(count + 1);
 * counterStore.reset();
 * ```
 */

export interface LocalStorageStoreOptions<T> {
  /** Unique key for localStorage */
  key: string;
  /** Function that returns the default value (called on reset or when no valid stored value exists) */
  defaultValue: () => T;
  /** Optional SSR-safe default (deterministic value for server/hydration) */
  ssrSafeValue?: () => T;
  /** Optional validation function (returns true if stored value is valid) */
  validate?: (value: unknown) => value is T;
  /** Optional transform function to merge stored data with defaults */
  transform?: (stored: Partial<T>, defaults: T) => T;
}

export interface LocalStorageStore<T> {
  /** Load value from localStorage (or default if not found/invalid) */
  load: () => T;
  /** Save value to localStorage */
  save: (value: T) => void;
  /** Reset to default value */
  reset: () => T;
  /** Get SSR-safe value (for hydration) */
  getSSRSafe: () => T;
  /** Get the storage key */
  key: string;
}

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Create a type-safe localStorage store
 */
export function createLocalStorageStore<T>(
  options: LocalStorageStoreOptions<T>
): LocalStorageStore<T> {
  const { key, defaultValue, ssrSafeValue, validate, transform } = options;

  /**
   * Get SSR-safe value for hydration
   */
  const getSSRSafe = (): T => {
    return ssrSafeValue ? ssrSafeValue() : defaultValue();
  };

  /**
   * Save value to localStorage
   */
  const save = (value: T): void => {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  };

  /**
   * Load value from localStorage
   */
  const load = (): T => {
    if (!isBrowser()) return defaultValue();

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        // No stored value - initialize with default
        const initial = defaultValue();
        save(initial);
        return initial;
      }

      const parsed = JSON.parse(raw);

      // If validation function provided, use it
      if (validate) {
        if (validate(parsed)) {
          // If transform provided, merge with defaults
          if (transform) {
            return transform(parsed as Partial<T>, defaultValue());
          }
          return parsed;
        }
        // Validation failed - return default
        return defaultValue();
      }

      // No validation - assume it's valid if parseable
      // If transform provided, merge with defaults
      if (transform) {
        return transform(parsed as Partial<T>, defaultValue());
      }
      return parsed as T;
    } catch {
      // Parse error - return default
      return defaultValue();
    }
  };

  /**
   * Reset to default value
   */
  const reset = (): T => {
    const newValue = defaultValue();
    save(newValue);
    return newValue;
  };

  return {
    load,
    save,
    reset,
    getSSRSafe,
    key,
  };
}

/**
 * Create a simple number store (for values like prepaid balance)
 */
export function createNumberStore(options: {
  key: string;
  defaultValue: () => number;
  ssrSafeValue?: number;
}): LocalStorageStore<number> & {
  /** Add to current value */
  add: (current: number, amount: number) => number;
  /** Subtract from current value */
  subtract: (current: number, amount: number) => number;
} {
  const store = createLocalStorageStore<number>({
    key: options.key,
    defaultValue: options.defaultValue,
    ssrSafeValue: options.ssrSafeValue !== undefined
      ? () => options.ssrSafeValue!
      : undefined,
    validate: (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value >= 0,
  });

  return {
    ...store,
    add: (current: number, amount: number): number => {
      const next = Number((current + amount).toFixed(2));
      store.save(next);
      return next;
    },
    subtract: (current: number, amount: number): number => {
      const next = Number(Math.max(0, current - amount).toFixed(2));
      store.save(next);
      return next;
    },
  };
}

/**
 * Create a list store (for arrays like activities)
 */
export function createListStore<T>(options: {
  key: string;
  defaultValue: () => T[];
  ssrSafeValue?: T[];
  maxItems?: number;
}): LocalStorageStore<T[]> & {
  /** Add item to front of list */
  prepend: (current: T[], item: T) => T[];
  /** Add item to end of list */
  append: (current: T[], item: T) => T[];
} {
  const maxItems = options.maxItems ?? 100;

  const store = createLocalStorageStore<T[]>({
    key: options.key,
    defaultValue: options.defaultValue,
    ssrSafeValue: options.ssrSafeValue !== undefined
      ? () => options.ssrSafeValue!
      : undefined,
    validate: (value): value is T[] => Array.isArray(value),
  });

  return {
    ...store,
    prepend: (current: T[], item: T): T[] => {
      const next = [item, ...current].slice(0, maxItems);
      store.save(next);
      return next;
    },
    append: (current: T[], item: T): T[] => {
      const next = [...current, item].slice(-maxItems);
      store.save(next);
      return next;
    },
  };
}
