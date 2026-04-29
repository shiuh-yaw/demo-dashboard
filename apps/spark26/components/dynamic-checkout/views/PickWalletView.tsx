"use client";

// Lists wallet providers and connects. Fires `onConnected` exactly once when
// a connection succeeds — tied to the mutation's resolve, not to the
// orchestrator's wallet-account state. This matters for backwards navigation
// (pressing "Change" from PickTokenView): setView("pickWallet") used to race
// against a state-based auto-advance that snapped back to pickToken.
import {
  connectWithWalletProvider,
  getAvailableWalletProvidersData,
} from "@dynamic-labs-sdk/client";
import type { WalletProviderData } from "@dynamic-labs-sdk/client";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { GhostButton, Panel, Spinner } from "../primitives.js";
import type { PickWalletViewProps } from "../types.js";
import { useClientState } from "../useClientState.js";

export function PickWalletView({ onConnected }: PickWalletViewProps) {
  const providers = useClientState<WalletProviderData[]>(
    "walletProviderChanged",
    (c) => getAvailableWalletProvidersData(c),
  );

  const connectMutation = useMutation({
    mutationFn: (wp: WalletProviderData) =>
      connectWithWalletProvider({ walletProviderKey: wp.key }),
    onSuccess: () => onConnected(),
  });

  const grouped = useMemo(() => {
    const map: Record<string, WalletProviderData[]> = {};
    for (const p of providers) {
      const key = p.metadata.displayName ?? p.key;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [providers]);

  if (connectMutation.isPending) {
    return (
      <Panel>
        <Spinner label="Connecting wallet…" />
      </Panel>
    );
  }

  if (connectMutation.error) {
    return (
      <Panel>
        <ErrorBlock message={connectMutation.error.message} />
        <GhostButton onClick={() => connectMutation.reset()}>Retry</GhostButton>
      </Panel>
    );
  }

  return (
    <Panel step={1}>
      <div>
        <h2 className="text-[22px]">Connect your wallet</h2>
        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--color-blue-100)_70%,transparent)]">
          EVM, Solana, Bitcoin, or WalletConnect — pick what you already use.
        </p>
      </div>
      <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
        {grouped.length === 0 && (
          <p className="text-xs text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)] text-center py-4">
            No wallet providers detected. Install a wallet extension or use
            WalletConnect.
          </p>
        )}
        {grouped.map(([name, group]) => {
          const provider = group[0];
          if (!provider) return null;
          return (
            <button
              key={name}
              type="button"
              onClick={() => connectMutation.mutate(provider)}
              className="row group text-left"
            >
              {provider.metadata.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={provider.metadata.icon}
                  alt=""
                  className="w-8 h-8 rounded-lg shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-white">
                  {name}
                </div>
                <div className="text-[11px] tracking-[0.12em] uppercase text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]">
                  {group.map((g) => g.chain).join(" · ")}
                </div>
              </div>
              <span
                aria-hidden
                className="text-[var(--color-blue-100)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                →
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-pink)]/40 bg-[var(--color-pink)]/10 px-4 py-3 text-sm text-[var(--color-pink-100)]">
      {message}
    </div>
  );
}
