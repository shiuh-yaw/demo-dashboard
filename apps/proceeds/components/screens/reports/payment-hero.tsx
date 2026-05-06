"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Button, Spinner } from "@dynamic-demos/ui";
import type { MonthlyProceeds } from "@/lib/mock-data";
import { formatUsd, truncateHash, truncateAddress } from "@/lib/format";
import { MetaRow } from "@/components/ui/meta-row";
import { StatusPill } from "@/components/ui/status-pill";
import type { StatusKind } from "@/components/ui/status-pill";
import { PayoutModal } from "@/components/screens/payout-modal";
import {
  getEvmWalletAccount,
  getSmartWalletAccount,
  onEvent,
  offEvent,
} from "@/lib/dynamic";

interface PaymentHeroProps {
  month: MonthlyProceeds;
}

/**
 * Two-column hero panel that mirrors App Store Connect's payment summary.
 * Left side is the amount + destination; right side is settlement metadata
 * for paid months or the demo-payout action for the current fiscal month.
 */
export function PaymentHero({ month }: PaymentHeroProps) {
  const isPaid = month.status === "paid";
  const label = isPaid ? "Payment" : "Total estimated proceeds";
  const accent = isPaid
    ? "var(--brand-status-completed-fg)"
    : "var(--brand-status-pending-fg)";

  const [modalOpen, setModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    const smart = getSmartWalletAccount();
    const evm = getEvmWalletAccount();
    return smart?.address ?? evm?.address ?? null;
  });

  useEffect(() => {
    const resolve = () => {
      const smart = getSmartWalletAccount();
      const evm = getEvmWalletAccount();
      setWalletAddress(smart?.address ?? evm?.address ?? null);
    };
    onEvent({ event: "walletAccountsChanged", listener: resolve });
    return () => offEvent({ event: "walletAccountsChanged", listener: resolve });
  }, []);

  const destination = walletAddress
    ? `Stablecoin Wallet · ${truncateAddress(walletAddress)}`
    : month.destination;

  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 0 }}>
      <div className="flex items-stretch" style={{ minHeight: "120px" }}>
        {/* Left: amount */}
        <div
          className="flex-1 px-8 py-6 border-r border-(--brand-border)"
          style={{ background: "var(--brand-strip-bg)" }}
        >
          <div
            className="text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: accent }}
          >
            {label} · {month.month}
          </div>
          <div className="text-[36px] font-semibold text-(--brand-fg) tracking-[-0.02em] tabular-nums leading-none mb-3">
            {formatUsd(month.totalUsdc)}
          </div>
          <div className="text-[13px] text-(--brand-muted)">
            {isPaid ? "Sent to" : "Will be sent to"}{" "}
            <span className="text-(--brand-fg) font-medium">
              {destination}
            </span>
          </div>
        </div>

        {/* Right: settlement / payout action */}
        <div className="flex-1 px-8 py-6 flex flex-col justify-center gap-3">
          {isPaid ? (
            <PaidMetadata month={month} />
          ) : (
            <EstimatedActions
              month={month}
              onOpenModal={() => setModalOpen(true)}
            />
          )}
        </div>
      </div>
      <PayoutModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        month={month}
      />
    </div>
  );
}

const FB_STATUS_MAP: Record<string, { kind: StatusKind; label: string }> = {
  SUBMITTED:       { kind: "neutral",   label: "Submitted" },
  PENDING:         { kind: "neutral",   label: "Pending" },
  OPEN:            { kind: "estimated", label: "Open" },
  PARTIALLY_FILLED:{ kind: "estimated", label: "Partially filled" },
  FILLED:          { kind: "paid",      label: "Filled" },
  CANCELLED:       { kind: "neutral",   label: "Cancelled" },
  FAILED:          { kind: "failed",    label: "Failed" },
  REJECTED:        { kind: "failed",    label: "Rejected" },
};

function PaidMetadata({ month }: { month: MonthlyProceeds }) {
  const orderId = month.settlementHash ?? null;
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setStatusLoading(true);
    fetch(`/api/payout/status?orderId=${encodeURIComponent(orderId)}`)
      .then((r) => r.json())
      .then((d: { status?: string }) => {
        if (d.status) setOrderStatus(d.status);
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [orderId]);

  const mapped = orderStatus ? (FB_STATUS_MAP[orderStatus] ?? { kind: "neutral" as StatusKind, label: orderStatus }) : null;

  return (
    <>
      <MetaRow label="Date issued" value={month.issuedDate ?? "—"} />
      <MetaRow
        label="Fireblocks order ID"
        value={
          orderId ? (
            <span className="font-mono text-(--brand-primary) tabular-nums">
              {truncateHash(orderId)}
            </span>
          ) : (
            "—"
          )
        }
      />
      <MetaRow
        label="Status"
        value={
          statusLoading ? (
            <Spinner size="sm" />
          ) : mapped ? (
            <StatusPill kind={mapped.kind} label={mapped.label} />
          ) : (
            <StatusPill kind="paid" />
          )
        }
      />
    </>
  );
}

interface EstimatedActionsProps {
  month: MonthlyProceeds;
  onOpenModal: () => void;
}

function EstimatedActions({ month, onOpenModal }: EstimatedActionsProps) {
  return (
    <>
      <MetaRow
        label="Expected payment date"
        value={month.expectedDate ?? "—"}
      />
      <MetaRow label="Status" value={<StatusPill kind="estimated" />} />
      <div className="text-[12px] text-(--brand-muted) leading-snug">
        Fiscal month still accruing. Use the demo action to push this
        month&apos;s proceeds onchain.
      </div>
      <div className="pt-1">
        <Button onClick={onOpenModal} className="w-full">
          <span className="inline-flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            Pay out {month.month} (demo)
          </span>
        </Button>
      </div>
    </>
  );
}
