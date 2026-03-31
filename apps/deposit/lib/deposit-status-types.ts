/**
 * Shared types for the deposit status API response.
 *
 * Consumed by the status route (`/api/deposit/[vaultId]/status`), the
 * polling hook (`useDepositStatusQuery`), and several UI components.
 */

import type {
  AmlScreeningSummary,
  TravelRuleScreeningSummary,
} from "@dynamic-demos/fireblocks";

export type DepositStatus =
  | "waiting"
  | "received"
  | "screening"
  | "transferring"
  | "complete"
  | "screening_failed";

export interface DepositItem {
  incomingTxId: string;
  /** On-chain tx hash when known (Basescan link). */
  txHash: string | null;
  /** On-chain hash of the vault → embedded wallet transfer, when Fireblocks has broadcast it. */
  forwardTxHash: string | null;
  amount: string;
  status: Exclude<DepositStatus, "waiting">;
  outgoingTxId: string | null;
  createdAt: number;
  /** Chainalysis / AML screening when Fireblocks returns it on the incoming tx. */
  amlScreening: AmlScreeningSummary | null;
  /** Travel Rule (e.g. Notabene) when Fireblocks returns it on the incoming tx. */
  travelRuleScreening: TravelRuleScreeningSummary | null;
}

export interface StatusResponse {
  asset: string;
  /** Newest first (same order as Fireblocks `listTransactions` DESC). */
  deposits: DepositItem[];
}
