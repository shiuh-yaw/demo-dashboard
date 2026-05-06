"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NetworkData } from "@dynamic-labs-sdk/client";

export interface NetworkSwitcherProps {
  networks: NetworkData[];
  active: NetworkData | null;
  switching: boolean;
  onSelect: (networkId: string) => void;
  /**
   * `inline` — the "Change ▾" link used inside the wallet card's
   * Network row. `header` — the colored pill used in the dashboard
   * navigation bar.
   */
  variant: "inline" | "header";
}

export function NetworkSwitcher({
  networks,
  active,
  switching,
  onSelect,
  variant,
}: NetworkSwitcherProps) {
  const [open, setOpen] = useState(false);
  const disabled = switching || networks.length <= 1;

  const handleSelect = (networkId: string) => {
    setOpen(false);
    if (networkId !== active?.networkId) {
      onSelect(networkId);
    }
  };

  return (
    <div className="relative">
      {open && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {variant === "header" ? (
        <HeaderTrigger
          active={active}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          expanded={open}
        />
      ) : (
        <InlineTrigger
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          expanded={open}
        />
      )}

      {open && (
        <div
          role="listbox"
          className={`absolute z-20 min-w-[200px] rounded-lg overflow-hidden shadow-lg ${
            variant === "header"
              ? "top-full right-0 mt-2 bg-[rgba(40,40,42,0.98)] border border-white/10 backdrop-blur-md"
              : "top-full right-0 mt-1.5 bg-(--brand-surface) border border-(--brand-border)"
          }`}
        >
          {networks.map((network) => {
            const isActive = network.networkId === active?.networkId;
            return (
              <button
                key={network.networkId}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(network.networkId)}
                className={`w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 transition-colors whitespace-nowrap cursor-pointer ${
                  variant === "header"
                    ? "hover:bg-white/5"
                    : "hover:bg-(--brand-row-bg)"
                }`}
                style={{
                  background: isActive
                    ? variant === "header"
                      ? "rgba(255,255,255,0.06)"
                      : "var(--brand-row-bg)"
                    : "transparent",
                }}
              >
                {network.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={network.iconUrl}
                    alt=""
                    className="w-4 h-4 rounded"
                  />
                )}
                <span
                  className={`text-[13px] font-medium ${
                    variant === "header"
                      ? "text-white"
                      : "text-(--brand-fg)"
                  }`}
                >
                  {network.displayName}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlineTrigger({
  disabled,
  onClick,
  expanded,
}: {
  disabled: boolean;
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-(--brand-primary) disabled:opacity-60 cursor-pointer"
    >
      Change
      <ChevronDown className="w-3.5 h-3.5" />
    </button>
  );
}

function HeaderTrigger({
  active,
  disabled,
  onClick,
  expanded,
}: {
  active: NetworkData | null;
  disabled: boolean;
  onClick: () => void;
  expanded: boolean;
}) {
  // Color-code testnets warmly so the demo's environment is unambiguous.
  // We don't have a runtime mainnet/testnet flag from Dynamic, so derive
  // it from the chainId (137 = Polygon mainnet; everything else here is
  // a testnet for this demo's enabled chains).
  const chainId = active ? Number(active.networkId) : null;
  const isMainnet = chainId === 137 || chainId === 1;
  const accent = isMainnet ? "rgb(48,209,88)" : "rgb(255,159,10)";
  const bg = isMainnet ? "rgba(48,209,88,0.12)" : "rgba(255,159,10,0.12)";
  const border = isMainnet
    ? "rgba(48,209,88,0.3)"
    : "rgba(255,159,10,0.3)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      title={active ? `Active network: ${active.displayName}` : undefined}
      className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5 text-[12px] font-medium leading-none border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default whitespace-nowrap shrink-0"
      style={{ background: bg, borderColor: border, color: accent }}
    >
      {active?.iconUrl ? (
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full overflow-hidden shrink-0"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.iconUrl}
            alt=""
            className="w-3.5 h-3.5"
          />
        </span>
      ) : (
        <span
          className="w-1.5 h-1.5 rounded-full ml-1.5"
          style={{ background: accent }}
        />
      )}
      <span className="whitespace-nowrap">
        {active?.displayName ?? "—"}
      </span>
      {!disabled && (
        <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
      )}
    </button>
  );
}
