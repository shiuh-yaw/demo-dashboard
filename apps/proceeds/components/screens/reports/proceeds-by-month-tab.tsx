"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
} from "lucide-react";
import type { MonthlyProceeds } from "@/lib/mock-data";
import {
  clearPayoutDemo,
  getPayoutDemoRecord,
} from "@/lib/payout-demo-store";
import { formatUnits, formatUsd, formatFxRate } from "@/lib/format";
import { useResolvedMonths } from "@/hooks/use-resolved-months";
import { MonogramChip } from "@/components/ui/monogram-chip";
import { PanelButton } from "@/components/ui/panel-button";
import { PaymentHero } from "./payment-hero";

export function ProceedsByMonthTab() {
  const months = useResolvedMonths();
  const [monthIndex, setMonthIndex] = useState(0);
  const [monthOpen, setMonthOpen] = useState(false);

  // Guard against an out-of-range index (e.g. if `months` ever shrinks).
  // In practice `monthlyProceeds` is a non-empty static list, but the type
  // system doesn't know that with `noUncheckedIndexedAccess`.
  const month = months[monthIndex];
  if (!month) return null;

  const totalUnits = month.breakdown.reduce((acc, c) => acc + c.units, 0);

  // `months` itself is rebuilt by `useResolvedMonths` whenever the payout
  // store changes, so referencing it here triggers the recompute.
  const hasAnyDemoRecord = months.some(
    (m) => getPayoutDemoRecord(m.monthKey) !== null,
  );

  return (
    <>
      {/* Control bar */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <button
          type="button"
          onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
          disabled={monthIndex === 0}
          className="w-8 h-8 rounded-md flex items-center justify-center text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-bg) transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Newer month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <MonthPicker
          months={months}
          monthIndex={monthIndex}
          open={monthOpen}
          onToggle={() => setMonthOpen((v) => !v)}
          onDismiss={() => setMonthOpen(false)}
          onSelect={(i) => {
            setMonthIndex(i);
            setMonthOpen(false);
          }}
        />

        <button
          type="button"
          onClick={() =>
            setMonthIndex((i) => Math.min(months.length - 1, i + 1))
          }
          disabled={monthIndex === months.length - 1}
          className="w-8 h-8 rounded-md flex items-center justify-center text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-bg) transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Older month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {hasAnyDemoRecord && (
          <button
            type="button"
            onClick={() => clearPayoutDemo()}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--brand-muted) hover:text-(--brand-fg) transition-colors"
            title="Reset the demo so you can re-run a month's payout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset demo
          </button>
        )}

        <PanelButton
          icon={<Download className="w-3.5 h-3.5" />}
          label="Create reports"
        />
      </div>

      <PaymentHero month={month} />

      <div className="mb-2 mt-8 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold text-(--brand-fg)">
          Proceeds by country or region
        </h3>
        <div className="text-[12px] text-(--brand-muted) tabular-nums">
          {formatUnits(totalUnits)} units sold · {month.breakdown.length}{" "}
          regions
        </div>
      </div>

      <CountryBreakdownTable month={month} />

      <p className="text-[11px] text-(--brand-muted) mt-3 px-1">
        Amounts displayed in USDC, net of Apple&apos;s commission and
        applicable taxes. Earnings below the minimum payment threshold are
        carried forward to the next fiscal month.
      </p>
    </>
  );
}

/* ---------- Subcomponents ---------- */

interface MonthPickerProps {
  months: MonthlyProceeds[];
  monthIndex: number;
  open: boolean;
  onToggle: () => void;
  onDismiss: () => void;
  onSelect: (index: number) => void;
}

function MonthPicker({
  months,
  monthIndex,
  open,
  onToggle,
  onDismiss,
  onSelect,
}: MonthPickerProps) {
  const month = months[monthIndex];
  if (!month) return null;
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-10" onClick={onDismiss} />}
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="text-[18px] font-semibold text-(--brand-fg) tracking-tight inline-flex items-center gap-1.5 hover:text-(--brand-primary) transition-colors"
      >
        {month.month}
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 min-w-[220px] bg-(--brand-surface) border border-(--brand-border) rounded-lg overflow-hidden shadow-lg"
        >
          {months.map((m, i) => (
            <button
              key={m.monthKey}
              role="option"
              aria-selected={i === monthIndex}
              onClick={() => onSelect(i)}
              className="w-full flex items-center justify-between text-left px-3.5 py-2.5 hover:bg-(--brand-row-bg) transition-colors"
              style={{
                background:
                  i === monthIndex ? "var(--brand-row-bg)" : "transparent",
              }}
            >
              <span className="text-[13px] text-(--brand-fg)">{m.month}</span>
              <span className="text-[12px] text-(--brand-muted) tabular-nums">
                {m.status === "paid" ? "Paid" : "Estimated"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CountryBreakdownTable({ month }: { month: MonthlyProceeds }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Country or region</th>
            <th style={{ textAlign: "right" }}>Units</th>
            <th style={{ textAlign: "right" }}>Earned</th>
            <th style={{ textAlign: "right" }}>FX rate</th>
            <th style={{ textAlign: "right" }}>Proceeds (USDC)</th>
          </tr>
        </thead>
        <tbody>
          {month.breakdown.map((row) => (
            <tr key={row.countryCode}>
              <td>
                <div className="flex items-center gap-3">
                  <MonogramChip label={row.countryCode} shape="wide" />
                  <span className="text-sm font-medium text-(--brand-fg)">
                    {row.country}
                  </span>
                </div>
              </td>
              <td style={{ textAlign: "right" }}>
                <span className="text-sm text-(--brand-fg) tabular-nums">
                  {formatUnits(row.units)}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <span className="text-sm text-(--brand-muted) tabular-nums whitespace-nowrap">
                  {row.localCurrency}{" "}
                  {row.earnedLocal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <span className="text-sm text-(--brand-muted) tabular-nums">
                  {formatFxRate(row.fxRate)}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <span className="text-sm font-medium text-(--brand-fg) tabular-nums whitespace-nowrap">
                  {formatUsd(row.proceedsUsdc)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "1px solid var(--brand-border)" }}>
            <td
              colSpan={4}
              style={{
                padding: "14px 28px",
                textAlign: "right",
                fontSize: "12px",
                color: "var(--brand-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Total proceeds
            </td>
            <td
              style={{
                padding: "14px 28px",
                textAlign: "right",
                fontWeight: 600,
              }}
            >
              <span className="text-[15px] text-(--brand-fg) tabular-nums whitespace-nowrap">
                {formatUsd(month.totalUsdc)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
