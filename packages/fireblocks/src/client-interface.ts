/**
 * Namespaced Fireblocks client surface.
 *
 * Split into its own module so the namespace member types (orders,
 * compliance, api, providers) can import freely from `types.ts`
 * without `types.ts` having to know about them — avoids cycles.
 */

import type * as alfredpay from "./providers/alfredpay";
import type * as mtlco from "./providers/mtlco";
import type { Fireblocks } from "@fireblocks/ts-sdk";

import type { FireblocksApiClient } from "./api";
import type { ComplianceModule } from "./compliance";
import type { OrdersNamespace } from "./orders";
import type {
  InternalWalletsNamespace,
  TransactionsNamespace,
  VaultNamespace,
} from "./types";

export interface IFireblocksClient {
  readonly vault: VaultNamespace;
  readonly transactions: TransactionsNamespace;
  readonly internalWallets: InternalWalletsNamespace;
  readonly orders: OrdersNamespace;
  readonly compliance: ComplianceModule;
  readonly providers: {
    mtlco: typeof mtlco;
    alfredpay: typeof alfredpay;
  };
  /** Raw `@fireblocks/ts-sdk` instance. Escape hatch for SDK-only endpoints. */
  readonly sdk: Fireblocks;
  /** Raw REST client with auth handled. Escape hatch for endpoints the SDK doesn't expose. */
  readonly api: FireblocksApiClient;
}
