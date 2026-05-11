/** Row-level display helpers for the deposit list (labels, colours, terminal detection). */

import type { DepositItem } from "@/lib/deposit-status-types";

export const DEPOSIT_ROW_STATUS_LABELS: Record<DepositItem["status"], string> =
  {
    received: "Verifying",
    screening: "Preparing transfer",
    transferring: "Sending",
    complete: "Done",
    screening_failed: "Blocked",
  };

export const DEPOSIT_ROW_STATUS_COLORS: Record<DepositItem["status"], string> =
  {
    received: "text-(--brand-muted)",
    screening: "text-(--brand-accent)",
    transferring: "text-(--brand-accent)",
    complete: "text-(--brand-success)",
    screening_failed: "text-(--brand-error)",
  };

const DEPOSIT_TERMINAL_STATUSES: DepositItem["status"][] = [
  "complete",
  "screening_failed",
];

export function isDepositStatusTerminal(
  status: DepositItem["status"],
): boolean {
  return DEPOSIT_TERMINAL_STATUSES.includes(status);
}
