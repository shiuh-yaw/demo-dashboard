import type { RealtimeService } from "@dynamic-labs-sdk/client/core";

// Dynamic's SDK auto-spins up an Ably realtime connection during
// `initializeClient()` and fetches `/realtime/auth`, which 500s because
// there's no user session pre-wallet-connect. Per Dynamic's own
// checkout-flow docs, status sync is polling-only (`getCheckoutTransaction`),
// so realtime isn't required for our flow. Inject this no-op to silence
// the SDK's auto-subscription.
export function createNoOpRealtimeService(): RealtimeService {
  return {
    connect: async () => undefined,
    disconnect: () => undefined,
    getConnectionState: () => "closed",
    on: () => undefined,
    off: () => undefined,
    subscribe: async () => undefined,
    unsubscribe: () => undefined,
    publish: async () => undefined,
  };
}
