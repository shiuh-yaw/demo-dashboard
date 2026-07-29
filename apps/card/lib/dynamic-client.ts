"use client";

/**
 * SSR-safe Dynamic client singleton for apps/card. Created only in the
 * browser (returns null on the server). Feeds DynamicProvider; react-hooks
 * read all state off this instance.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/client/create-dynamic-client
 */

import { createDynamicClient, type DynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { createDynamicClientSingleton } from "@dynamic-demos/dynamic/client-singleton";
import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";

const singleton = createDynamicClientSingleton<DynamicClient>({
  create: () => {
    const { environmentId } = resolveCredentials();
    return createDynamicClient({
      environmentId,
      autoInitialize: true,
      metadata: {
        name: "JS SDK Card Demo",
        // Correct OAuth redirect origin property (was previously unset).
        universalLink:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
  },
  extend: (client) => {
    addEvmExtension(client);
  },
});

/** Get or create the Dynamic client. Returns null during SSR. */
export function getClient(): DynamicClient | null {
  return singleton.getClient();
}
