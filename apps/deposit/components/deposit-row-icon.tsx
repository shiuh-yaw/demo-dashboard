"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { DepositItem } from "@/lib/deposit-status-types";
import { isDepositStatusTerminal } from "@/lib/deposit-list-status";

export function DepositRowIcon({ status }: { status: DepositItem["status"] }) {
  if (!isDepositStatusTerminal(status)) {
    return (
      <Loader2
        className="size-4 shrink-0 animate-spin text-(--brand-accent)"
        aria-hidden
      />
    );
  }
  if (status === "complete") {
    return (
      <Check
        className="size-4 shrink-0 text-(--brand-success)"
        strokeWidth={2}
        aria-hidden
      />
    );
  }
  return (
    <AlertCircle
      className="size-4 shrink-0 text-(--brand-error)"
      strokeWidth={2}
      aria-hidden
    />
  );
}
