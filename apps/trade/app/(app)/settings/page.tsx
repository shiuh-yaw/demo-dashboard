"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { useUserMetadata } from "@/hooks/use-user-metadata";
import { getAuthToken } from "@/lib/dynamic";
import { MOCK_METADATA_STORAGE_KEY } from "@/lib/mock-metadata";
import { METADATA_KEYS } from "@dynamic-demos/dynamic";
import { cn } from "@dynamic-demos/utils";

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/** Human-readable labels for known metadata keys */
const KEY_LABELS: Record<string, string> = {
  [METADATA_KEYS.IS_KYC_COMPLETED]: "KYC completed",
  [METADATA_KEYS.WALLET_TYPE]: "Wallet type",
  [METADATA_KEYS.FIREBLOCKS]: "Fireblocks",
  kyc_approved: "KYC approved (legacy)",
};

function formatValue(value: unknown, key?: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") {
    if (key === METADATA_KEYS.FIREBLOCKS && value && typeof value === "object" && "vaultId" in value && "vaultAddress" in value) {
      const fb = value as { vaultId: string; vaultAddress: string };
      return `vaultId: ${fb.vaultId}\nvaultAddress: ${fb.vaultAddress}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { metadata, wallets, userId, isLoading, error } = useUserMetadata();
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const handleReset = async (key: string) => {
    setResettingKey(key);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/user/metadata/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(MOCK_METADATA_STORAGE_KEY);
            if (raw) {
              const stored = JSON.parse(raw) as Record<string, unknown>;
              if (key in stored) {
                delete stored[key];
                localStorage.setItem(
                  MOCK_METADATA_STORAGE_KEY,
                  JSON.stringify(stored),
                );
              }
            }
          } catch {
            // ignore parse errors
          }
        }
        queryClient.invalidateQueries({ queryKey: ["user-metadata"] });
        queryClient.invalidateQueries({ queryKey: ["mock-metadata"] });
      }
    } finally {
      setResettingKey(null);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/user/metadata/reset-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(MOCK_METADATA_STORAGE_KEY);
        }
        queryClient.invalidateQueries({ queryKey: ["user-metadata"] });
        queryClient.invalidateQueries({ queryKey: ["mock-metadata"] });
      }
    } finally {
      setClearingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-trade-text-secondary">
        Loading metadata…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-trade-error">
        Failed to load metadata. Please try again.
      </div>
    );
  }

  const entries = Object.entries(metadata);
  const sortedEntries = [...entries].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-trade-text-primary">
          Settings
        </h1>
        <p className="mt-1 text-sm text-trade-text-secondary">
          Dynamic user metadata for the current account
        </p>
      </div>

      <div className="rounded-xl border border-trade-border bg-trade-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-trade-border bg-trade-surface-blue/50 dark:bg-trade-surface/80">
          <p className="text-xs font-medium text-trade-text-muted uppercase tracking-wider">
            User ID
          </p>
          <p className="mt-0.5 font-mono text-sm text-trade-text-primary break-all">
            {userId ?? "—"}
          </p>
        </div>

        {wallets.length > 0 && (
          <div className="border-b border-trade-border">
            <div className="px-4 py-2 bg-trade-surface-blue/30 dark:bg-trade-surface/60">
              <p className="text-xs font-medium text-trade-text-muted uppercase tracking-wider">
                Wallets ({wallets.length})
              </p>
            </div>
            <div className="divide-y divide-trade-border">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  className="px-4 py-3 flex flex-col gap-1"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-sm text-trade-text-primary">
                      {truncateAddress(w.publicKey)}
                    </span>
                    <span className="text-xs text-trade-text-muted">
                      {w.chain}
                    </span>
                    <span className="text-xs text-trade-text-muted">
                      {w.provider}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-trade-text-muted break-all">
                    {w.publicKey}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="px-4 py-2 bg-trade-surface-blue/30 dark:bg-trade-surface/60 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-trade-text-muted uppercase tracking-wider">
              Metadata
            </p>
            {sortedEntries.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearingAll}
                title="Clear all metadata (including localStorage)"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                  "text-trade-text-muted hover:text-trade-text-primary hover:bg-trade-accent-muted",
                  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <Trash2 size={14} className={clearingAll ? "animate-pulse" : ""} />
                Clear all
              </button>
            )}
          </div>
          <div className="divide-y divide-trade-border">
          {sortedEntries.length === 0 ? (
            <div className="px-4 py-8 text-center text-trade-text-muted text-sm">
              No metadata stored
            </div>
          ) : (
            sortedEntries.map(([key, value]) => (
              <div
                key={key}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-trade-text-muted uppercase tracking-wider">
                    {KEY_LABELS[key] ?? key}
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-trade-text-primary break-all whitespace-pre-line">
                    {formatValue(value, key)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReset(key)}
                  disabled={resettingKey === key}
                  title={`Reset ${KEY_LABELS[key] ?? key}`}
                  className={cn(
                    "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
                    "text-trade-text-muted hover:text-trade-text-primary hover:bg-trade-accent-muted",
                    "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  <RotateCcw
                    size={16}
                    className={resettingKey === key ? "animate-spin" : ""}
                  />
                </button>
              </div>
            ))
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
