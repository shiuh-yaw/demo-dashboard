"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Wallet,
  X,
  Shield,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import {
  FIREBLOCKS_VAULT_METADATA_KEY,
  KYC_APPROVED_METADATA_KEY,
} from "@/lib/dynamic-api";
import {
  getMetadataString,
  hasMetadataString,
  isMetadataTruthy,
} from "@/lib/user-metadata";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";

const SEARCH_DEBOUNCE_MS = 300;

interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, unknown>;
  usdcBalance?: number;
  wallets?: Array<{
    id: string;
    publicKey: string;
    chain: string;
    walletProvider: string;
  }>;
}

interface UserListProps {
  initialUsers: User[];
  error: string | null;
}

export function UserList({ initialUsers, error }: UserListProps) {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [isCreatingWallet, setIsCreatingWallet] = useState<string | null>(null);
  const [isCreatingVault, setIsCreatingVault] = useState<string | null>(null);
  const { lastCopiedText, copy } = useCopyFeedback();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const refreshUsers = useCallback(async (search?: string) => {
    const params = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/admin/users${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    if (isInitialMount.current && searchQuery === "") {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      setIsSearching(true);
      try {
        await refreshUsers(searchQuery.trim() || undefined);
      } catch {
        // keep current list
      }
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, refreshUsers]);

  const createWallet = async (
    email: string,
    loadingKey: string,
    userId?: string,
  ) => {
    setIsCreatingWallet(loadingKey);
    setResult(null);
    try {
      const res = await fetch("/api/admin/users/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userId ? { userId } : { email }),
      });
      const data = await res.json();
      if (data.address) {
        setResult({
          type: "success",
          message: `Wallet created: ${data.address}. The user can refresh their session to see it.`,
        });
        setCreateEmail("");
        await refreshUsers(searchQuery.trim() || undefined);
      } else {
        setResult({
          type: "error",
          message: data.error ?? "Failed to create wallet",
        });
      }
    } catch {
      setResult({ type: "error", message: "Failed to create wallet" });
    }
    setIsCreatingWallet(null);
  };

  const createVault = async (userId: string, loadingKey: string) => {
    setIsCreatingVault(loadingKey);
    setResult(null);
    try {
      const res = await fetch("/api/admin/users/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.address) {
        setResult({
          type: "success",
          message: `Fireblocks vault: ${truncateAddress(data.address, 10, 8)}`,
        });
        await refreshUsers(searchQuery.trim() || undefined);
      } else {
        setResult({
          type: "error",
          message: data.error ?? "Failed to create vault",
        });
      }
    } catch {
      setResult({ type: "error", message: "Failed to create vault" });
    }
    setIsCreatingVault(null);
  };

  if (error) {
    return (
      <Card title="Users">
        <p className="text-sm text-(--widget-error) text-center py-8">
          {error}
        </p>
      </Card>
    );
  }

  return (
    <Card title="Users" description="Dynamic wallets and Fireblocks vaults">
      <div className="space-y-4 mb-4">
        {isMounted ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--widget-muted) pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-(--widget-radius) border border-(--widget-border) bg-white focus:outline-none focus:ring-2 focus:ring-(--widget-primary)/20 focus:border-(--widget-primary)"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--widget-muted) hover:text-(--widget-fg) cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                inputMode="email"
                autoComplete="off"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="Email to create wallet for..."
                className="flex-1 px-3 py-2 text-sm rounded-(--widget-radius) border border-(--widget-border) bg-white focus:outline-none focus:ring-2 focus:ring-(--widget-primary)/20 focus:border-(--widget-primary)"
              />
              <Button
                onClick={() => createWallet(createEmail.trim(), "new")}
                loading={isCreatingWallet === "new"}
                disabled={!createEmail.includes("@")}
              >
                <Wallet className="w-4 h-4" />
                Create Wallet
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="h-10 rounded-(--widget-radius) bg-(--widget-row-bg) animate-pulse" />
            <div className="h-10 rounded-(--widget-radius) bg-(--widget-row-bg) animate-pulse" />
          </div>
        )}
      </div>

      {result && (
        <div
          className={`mb-4 p-3 rounded text-sm flex items-center justify-between ${
            result.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <span className="font-mono text-xs">{result.message}</span>
          <button
            onClick={() => setResult(null)}
            className="ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isSearching ? (
        <div className="text-center py-8">
          <p className="text-sm text-(--widget-muted)">Searching...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-(--widget-muted)">
            {searchQuery
              ? `No users found for "${searchQuery}"`
              : "No users yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isClaimed =
              user.email &&
              isMetadataTruthy(user, KYC_APPROVED_METADATA_KEY) &&
              (user.wallets?.length ?? 0) > 0 &&
              hasMetadataString(user, FIREBLOCKS_VAULT_METADATA_KEY);
            const hasEmbedded = (user.wallets?.length ?? 0) > 0;
            const hasVault = hasMetadataString(
              user,
              FIREBLOCKS_VAULT_METADATA_KEY,
            );

            return (
              <div
                key={user.id}
                className="rounded-(--widget-radius) border border-(--widget-border) bg-(--widget-row-bg) overflow-hidden"
              >
                {/* Top row: identity + balance + status */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {user.email ?? user.phoneNumber ?? user.id}
                      </p>
                      {isClaimed && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-(--widget-success) shrink-0"
                          title="Account fully set up and claimed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Claimed
                        </span>
                      )}
                    </div>
                    {(user.firstName || user.lastName) && (
                      <p className="text-xs text-(--widget-muted) mt-0.5">
                        {[user.firstName, user.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-3 shrink-0">
                    {typeof user.usdcBalance === "number" && (
                      <div className="text-right">
                        <p className="text-xs text-(--widget-muted) uppercase tracking-wide">
                          USDC Balance
                        </p>
                        <p className="text-lg font-semibold tabular-nums">
                          {user.usdcBalance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 justify-end">
                      <StatusBadge
                        label="KYC"
                        ok={isMetadataTruthy(user, KYC_APPROVED_METADATA_KEY)}
                      />
                      {!hasEmbedded && user.email ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            createWallet(user.email!, user.id, user.id)
                          }
                          loading={isCreatingWallet === user.id}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Create Embedded
                        </Button>
                      ) : (
                        <StatusBadge label="Embedded" ok={hasEmbedded} />
                      )}
                      {user.email &&
                        (hasVault ? (
                          <StatusBadge label="Vault" ok />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              createVault(user.id, `vault-${user.id}`)
                            }
                            loading={isCreatingVault === `vault-${user.id}`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Create Vault
                          </Button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Addresses section */}
                {((user.wallets?.length ?? 0) > 0 ||
                  getMetadataString(user, FIREBLOCKS_VAULT_METADATA_KEY)) && (
                  <div className="px-4 py-3 border-t border-(--widget-border) bg-white/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {user.wallets?.map((w) => (
                        <AddressRow
                          key={w.id}
                          label={w.chain}
                          address={w.publicKey}
                          justCopied={lastCopiedText === w.publicKey}
                          onCopy={copy}
                        />
                      ))}
                      {getMetadataString(
                        user,
                        FIREBLOCKS_VAULT_METADATA_KEY,
                      ) && (
                        <AddressRow
                          label="Vault"
                          address={
                            getMetadataString(
                              user,
                              FIREBLOCKS_VAULT_METADATA_KEY,
                            )!
                          }
                          justCopied={
                            lastCopiedText ===
                            getMetadataString(
                              user,
                              FIREBLOCKS_VAULT_METADATA_KEY,
                            )
                          }
                          onCopy={copy}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function AddressRow({
  label,
  address,
  justCopied,
  onCopy,
}: {
  label: string;
  address: string;
  justCopied: boolean;
  onCopy: (text: string, e?: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="px-1.5 py-0.5 rounded bg-(--widget-row-hover) font-mono shrink-0">
        {label}
      </span>
      <span className="font-mono text-(--widget-muted) truncate flex-1 min-w-0">
        {truncateAddress(address)}
      </span>
      <button
        type="button"
        onClick={(e) => onCopy(address, e)}
        className="p-1 rounded text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) cursor-pointer shrink-0 transition-colors"
        aria-label={`Copy ${label} address`}
        title="Copy address"
      >
        {justCopied ? (
          <Check className="w-3.5 h-3.5 text-(--widget-success)" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shrink-0 bg-(--widget-row-hover) ${
        ok ? "text-(--widget-success)" : "text-(--widget-muted)"
      }`}
    >
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-(--widget-radius-lg) border border-(--widget-border) p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-(--widget-muted) mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
