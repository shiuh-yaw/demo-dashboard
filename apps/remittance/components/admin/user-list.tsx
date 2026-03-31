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
  Send,
  ArrowDownLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Spinner,
  ErrorBanner,
  Tooltip,
  Skeleton,
  Input,
} from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import {
  FIREBLOCKS_VAULT_METADATA_KEY,
  FIREBLOCKS_VAULT_ID_METADATA_KEY,
  KYC_APPROVED_METADATA_KEY,
} from "@/lib/dynamic-api";
import {
  getMetadataString,
  hasMetadataString,
  isMetadataTruthy,
} from "@/lib/user-metadata";
import { getExplorerAddressUrl } from "@/lib/constants";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";

const SEARCH_DEBOUNCE_MS = 300;

function fmt(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, unknown>;
  usdcBalance?: number;
  walletBalance?: number;
  vaultBalance?: number;
  vaultId?: string | null;
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

function getUserFlags(user: User) {
  const hasKyc = isMetadataTruthy(user, KYC_APPROVED_METADATA_KEY);
  const hasWallet = (user.wallets?.length ?? 0) > 0;
  const hasVault = hasMetadataString(user, FIREBLOCKS_VAULT_METADATA_KEY);
  const isFullySetUp = !!(user.email && hasKyc && hasWallet && hasVault);
  const evmWallet = user.wallets?.find((w) => w.chain === "EVM");
  const vaultAddress = getMetadataString(user, FIREBLOCKS_VAULT_METADATA_KEY);
  const vaultId =
    user.vaultId ?? getMetadataString(user, FIREBLOCKS_VAULT_ID_METADATA_KEY);
  return {
    hasKyc,
    hasWallet,
    hasVault,
    isFullySetUp,
    evmWallet,
    vaultAddress,
    vaultId,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  UserList – orchestrator                                                  *
 * ═══════════════════════════════════════════════════════════════════════════ */

export function UserList({ initialUsers, error }: UserListProps) {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createVaultToo, setCreateVaultToo] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [isCreatingWallet, setIsCreatingWallet] = useState<string | null>(null);
  const [isCreatingVault, setIsCreatingVault] = useState<string | null>(null);
  const [transferAmounts, setTransferAmounts] = useState<
    Record<string, string>
  >({});
  const [isTransferring, setIsTransferring] = useState<string | null>(null);
  const [isSweeping, setIsSweeping] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeletingVault, setIsDeletingVault] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss success banners after 4s
  useEffect(() => {
    if (result?.type !== "success") return;
    const timer = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(timer);
  }, [result]);

  const refreshUsers = useCallback(async (search?: string) => {
    const params = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/admin/users${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
  }, []);

  const prevSearchRef = useRef(searchQuery);
  useEffect(() => {
    if (prevSearchRef.current === searchQuery) return;
    prevSearchRef.current = searchQuery;
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
        body: JSON.stringify({
          ...(userId ? { userId } : { email }),
          createVault: false,
        }),
      });
      const data = await res.json();
      if (data.address) {
        setResult({
          type: "success",
          message: `Wallet created: ${data.address}`,
        });
        setCreateEmail("");
        setShowCreateModal(false);
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

  const createUserWithOptions = async () => {
    const email = createEmail.trim();
    if (!email.includes("@")) return;

    setIsCreatingWallet("new");
    setResult(null);
    try {
      const res = await fetch("/api/admin/users/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, createVault: createVaultToo }),
      });
      const data = await res.json();
      if (!data.address) {
        setResult({
          type: "error",
          message: data.error ?? "Failed to create wallet",
        });
        setIsCreatingWallet(null);
        return;
      }

      setResult({
        type: "success",
        message: `Wallet created: ${truncateAddress(data.address, 10, 8)}${createVaultToo ? " + vault" : ""}`,
      });
      setCreateEmail("");
      setShowCreateModal(false);
      await refreshUsers(searchQuery.trim() || undefined);
    } catch {
      setResult({ type: "error", message: "Failed to create user" });
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
          message: `Vault created: ${truncateAddress(data.address, 10, 8)}`,
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

  const transferToWallet = async (user: User) => {
    const amount = transferAmounts[user.id]?.trim();
    if (!amount) return;
    const walletAddress = user.wallets?.find(
      (w) => w.chain === "EVM",
    )?.publicKey;
    if (!walletAddress) return;

    setIsTransferring(user.id);
    setResult(null);
    try {
      const res = await fetch("/api/admin/transfer-to-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, amount }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          type: "success",
          message: `Transfer initiated (tx: ${data.id ?? "pending"})`,
        });
        setTransferAmounts((prev) => ({ ...prev, [user.id]: "" }));
        await refreshUsers(searchQuery.trim() || undefined);
      } else {
        setResult({
          type: "error",
          message: data.error ?? "Transfer failed",
        });
      }
    } catch {
      setResult({ type: "error", message: "Transfer failed" });
    }
    setIsTransferring(null);
  };

  const sweepVault = async (user: User) => {
    const vaultId =
      user.vaultId ?? getMetadataString(user, FIREBLOCKS_VAULT_ID_METADATA_KEY);
    if (!vaultId || !user.vaultBalance) return;

    setIsSweeping(user.id);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId,
          amount: String(user.vaultBalance),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          type: "success",
          message: `Sweep initiated (tx: ${data.id ?? "pending"})`,
        });
        await refreshUsers(searchQuery.trim() || undefined);
      } else {
        setResult({
          type: "error",
          message: data.error ?? "Sweep failed",
        });
      }
    } catch {
      setResult({ type: "error", message: "Sweep failed" });
    }
    setIsSweeping(null);
  };

  const deleteUserAction = async (userId: string) => {
    setIsDeleting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          type: "success",
          message: `User deleted${data.vaultHidden ? " (vault hidden)" : ""}`,
        });
        setSelectedUserId(null);
        setConfirmDelete(false);
        await refreshUsers(searchQuery.trim() || undefined);
      } else {
        setResult({
          type: "error",
          message: data.error ?? "Failed to delete user",
        });
      }
    } catch {
      setResult({ type: "error", message: "Failed to delete user" });
    }
    setIsDeleting(false);
  };

  const deleteVaultAction = async (userId: string, vaultId: string) => {
    setIsDeletingVault(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/users/vault", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, vaultId }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: "success", message: "Vault removed" });
        await refreshUsers(searchQuery.trim() || undefined);
      } else {
        setResult({
          type: "error",
          message: data.error ?? "Failed to remove vault",
        });
      }
    } catch {
      setResult({ type: "error", message: "Failed to remove vault" });
    }
    setIsDeletingVault(false);
  };

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  if (error) {
    return (
      <div>
        <PageHeader title="Users" />
        <p className="text-sm text-(--widget-error) text-center py-8">
          {error}
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <PageHeader
          title="Users"
          count={users.length}
          description="Manage wallets, vaults, and balances for all users."
          search={
            isMounted ? (
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--widget-muted) pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email..."
                  className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border border-(--widget-border) bg-white focus:outline-none focus:ring-2 focus:ring-(--widget-primary)/20 focus:border-(--widget-primary)"
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
            ) : (
              <div className="h-8 w-64 rounded-lg bg-(--widget-row-bg) animate-pulse" />
            )
          }
          action={
            isMounted ? (
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-3.5 h-3.5" />
                New User
              </Button>
            ) : null
          }
        />

        {/* Feedback banner */}
        {result && (
          <div className="mb-4">
            <ErrorBanner
              message={result.message}
              type={result.type === "success" ? "info" : "error"}
              onDismiss={() => setResult(null)}
            />
          </div>
        )}

        {/* Table + Overlay Drawer */}
        <div className="relative">
          <UserTable
            users={users}
            isSearching={isSearching}
            searchQuery={searchQuery}
            selectedUserId={selectedUserId}
            onSelectUser={(id) => {
              setSelectedUserId(id === selectedUserId ? null : id);
              setConfirmDelete(false);
            }}
            onCreateUser={() => setShowCreateModal(true)}
          />

          <UserDrawer
            user={selectedUser}
            open={!!selectedUser}
            onClose={() => setSelectedUserId(null)}
            transferAmount={
              selectedUser ? (transferAmounts[selectedUser.id] ?? "") : ""
            }
            onTransferAmountChange={(val) => {
              if (!selectedUser) return;
              setTransferAmounts((prev) => ({
                ...prev,
                [selectedUser.id]: val,
              }));
            }}
            onTransfer={() => selectedUser && transferToWallet(selectedUser)}
            isTransferring={isTransferring === selectedUser?.id}
            onSweep={() => selectedUser && sweepVault(selectedUser)}
            isSweeping={isSweeping === selectedUser?.id}
            onCreateWallet={() => {
              if (!selectedUser?.email) return;
              createWallet(
                selectedUser.email,
                selectedUser.id,
                selectedUser.id,
              );
            }}
            isCreatingWallet={isCreatingWallet === selectedUser?.id}
            onCreateVault={() => {
              if (!selectedUser) return;
              createVault(selectedUser.id, `vault-${selectedUser.id}`);
            }}
            isCreatingVault={isCreatingVault === `vault-${selectedUser?.id}`}
            onDeleteVault={() => {
              if (!selectedUser) return;
              const flags = getUserFlags(selectedUser);
              if (flags.vaultId)
                deleteVaultAction(selectedUser.id, flags.vaultId);
            }}
            isDeletingVault={isDeletingVault}
            confirmDelete={confirmDelete}
            onConfirmDeleteChange={setConfirmDelete}
            onDelete={() => selectedUser && deleteUserAction(selectedUser.id)}
            isDeleting={isDeleting}
          />
        </div>
      </div>

      {/* Create User Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setCreateEmail("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New User</DialogTitle>
            <DialogDescription>
              Provision a Dynamic wallet for a new or existing user by email
              address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Input
              label="Email address"
              type="text"
              inputMode="email"
              autoComplete="off"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="user@example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter" && createEmail.includes("@")) {
                  createUserWithOptions();
                }
              }}
            />

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={createVaultToo}
                onChange={(e) => setCreateVaultToo(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-(--widget-primary) focus:ring-(--widget-primary)/20 cursor-pointer"
              />
              <div>
                <span className="text-sm font-medium">
                  Also create Fireblocks vault
                </span>
                <p className="text-xs text-(--widget-muted)">
                  Provisions a deposit address for receiving funds
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setCreateEmail("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={createUserWithOptions}
              loading={isCreatingWallet === "new"}
              disabled={!createEmail.includes("@")}
            >
              <Plus className="w-3.5 h-3.5" />
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  UserTable                                                                *
 * ═══════════════════════════════════════════════════════════════════════════ */

function UserTable({
  users,
  isSearching,
  searchQuery,
  selectedUserId,
  onSelectUser,
  onCreateUser,
}: {
  users: User[];
  isSearching: boolean;
  searchQuery: string;
  selectedUserId: string | null;
  onSelectUser: (id: string) => void;
  onCreateUser: () => void;
}) {
  return (
    <div className="border border-(--widget-border) rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1fr_140px_80px_80px_28px] gap-x-3 bg-(--widget-row-bg) px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-(--widget-muted) border-b border-(--widget-border)">
        <span>User</span>
        <span>Status</span>
        <span className="text-right">Wallet</span>
        <span className="text-right">Vault</span>
        <span />
      </div>

      {isSearching ? (
        <div className="divide-y divide-(--widget-border)">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_140px_80px_80px_28px] gap-x-3 items-center px-4 py-2.5"
            >
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14 ml-auto" />
              <Skeleton className="h-4 w-14 ml-auto" />
              <Skeleton className="h-4 w-4 ml-auto" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-(--widget-muted)">
            {searchQuery
              ? `No users found for "${searchQuery}"`
              : "No users yet"}
          </p>
          {!searchQuery && (
            <button
              onClick={onCreateUser}
              className="mt-2 text-sm text-(--widget-primary) hover:underline cursor-pointer"
            >
              Create your first user
            </button>
          )}
        </div>
      ) : (
        users.map((user, i) => {
          const { hasKyc, hasWallet, hasVault, isFullySetUp } =
            getUserFlags(user);
          const isSelected = user.id === selectedUserId;
          const isLast = i === users.length - 1;
          const walletBal = user.walletBalance ?? 0;
          const vaultBal = user.vaultBalance ?? 0;

          const missing: string[] = [];
          if (!hasKyc) missing.push("KYC");
          if (!hasWallet) missing.push("Wallet");
          if (!hasVault) missing.push("Vault");

          return (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelectUser(user.id)}
              className={`w-full grid grid-cols-[1fr_140px_80px_80px_28px] gap-x-3 items-center px-4 py-2.5 text-left transition-colors cursor-pointer ${
                isSelected
                  ? "bg-(--widget-primary)/5 border-l-2 border-l-(--widget-primary)"
                  : "bg-white hover:bg-slate-50/80 border-l-2 border-l-transparent"
              } ${!isLast ? "border-b border-(--widget-border)" : ""}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">
                  {user.email ?? user.phoneNumber ?? user.id}
                </span>
              </div>

              <div>
                {isFullySetUp ? (
                  <Tooltip content="KYC, Wallet, Vault">
                    <span className="inline-flex items-center gap-1 text-xs text-(--widget-success)">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="font-medium">Ready</span>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip content={`Missing: ${missing.join(", ")}`}>
                    <span className="inline-flex items-center gap-1.5 text-xs text-(--widget-muted)">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{missing.join(", ")}</span>
                    </span>
                  </Tooltip>
                )}
              </div>

              <span
                className={`text-sm tabular-nums text-right ${
                  walletBal > 0
                    ? "font-semibold"
                    : "text-(--widget-muted)"
                }`}
              >
                {walletBal > 0 ? fmt(walletBal) : "—"}
              </span>

              <span
                className={`text-sm tabular-nums text-right ${
                  vaultBal > 0
                    ? "font-semibold"
                    : "text-(--widget-muted)"
                }`}
              >
                {vaultBal > 0 ? fmt(vaultBal) : "—"}
              </span>

              <ChevronRight
                className={`w-4 h-4 ${
                  isSelected ? "text-(--widget-primary)" : "text-(--widget-muted)"
                }`}
              />
            </button>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  UserDrawer                                                               *
 * ═══════════════════════════════════════════════════════════════════════════ */

function UserDrawer({
  user,
  open,
  onClose,
  transferAmount,
  onTransferAmountChange,
  onTransfer,
  isTransferring,
  onSweep,
  isSweeping,
  onCreateWallet,
  isCreatingWallet,
  onCreateVault,
  isCreatingVault,
  onDeleteVault,
  isDeletingVault,
  confirmDelete,
  onConfirmDeleteChange,
  onDelete,
  isDeleting,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  transferAmount: string;
  onTransferAmountChange: (val: string) => void;
  onTransfer: () => void;
  isTransferring: boolean;
  onSweep: () => void;
  isSweeping: boolean;
  onCreateWallet: () => void;
  isCreatingWallet: boolean;
  onCreateVault: () => void;
  isCreatingVault: boolean;
  onDeleteVault: () => void;
  isDeletingVault: boolean;
  confirmDelete: boolean;
  onConfirmDeleteChange: (open: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { lastCopiedText, copy } = useCopyFeedback();

  const flags = user ? getUserFlags(user) : null;
  const walletBal = user?.walletBalance ?? 0;
  const vaultBal = user?.vaultBalance ?? 0;
  const totalBal =
    typeof user?.usdcBalance === "number"
      ? user.usdcBalance
      : walletBal + vaultBal;

  return (
    <div
      className={`absolute top-0 right-0 z-10 w-[380px] transition-all duration-250 ease-out ${
        open
          ? "translate-x-0 opacity-100"
          : "translate-x-4 opacity-0 pointer-events-none"
      }`}
    >
      {user && flags && (
        <div className="w-[380px] border border-(--widget-border) rounded-xl bg-white overflow-hidden shadow-lg">
          {/* Header */}
          <div className="px-5 py-4 border-b border-(--widget-border) bg-(--widget-row-bg)/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {user.email ?? user.phoneNumber ?? "Unknown"}
                </h3>
                <p className="text-[11px] text-(--widget-muted) font-mono mt-0.5 truncate">
                  {user.id}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-(--widget-muted) hover:text-(--widget-fg) hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <Badge active={flags.hasKyc}>KYC</Badge>
              <Badge active={flags.hasWallet}>Wallet</Badge>
              <Badge active={flags.hasVault}>Vault</Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Balance breakdown */}
            <div>
              <span className="text-xs font-medium text-(--widget-muted) uppercase tracking-wider">
                Balance
              </span>
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <span className="text-(--widget-muted)">Wallet</span>
                <span className="text-right tabular-nums font-medium">
                  {walletBal > 0 ? fmt(walletBal) : "—"}{" "}
                  <span className="text-[10px] font-normal text-(--widget-muted)">
                    USDC
                  </span>
                </span>
                <span className="text-(--widget-muted)">Vault</span>
                <span className="text-right tabular-nums font-medium">
                  {vaultBal > 0 ? fmt(vaultBal) : "—"}{" "}
                  <span className="text-[10px] font-normal text-(--widget-muted)">
                    USDC
                  </span>
                </span>
                <hr className="col-span-2 border-(--widget-border) my-1" />
                <span className="font-semibold">Total</span>
                <span className="text-right tabular-nums font-semibold">
                  {fmt(totalBal)}{" "}
                  <span className="text-[10px] font-normal text-(--widget-muted)">
                    USDC
                  </span>
                </span>
              </div>
            </div>

            <hr className="border-(--widget-border)" />

            {/* Wallet section */}
            <DrawerCard title="Wallet" icon={<Wallet className="w-4 h-4" />}>
              {flags.hasWallet && flags.evmWallet ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <a
                        href={getExplorerAddressUrl(flags.evmWallet.publicKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-(--widget-muted) hover:text-(--widget-primary) truncate transition-colors"
                        title={flags.evmWallet.publicKey}
                      >
                        {truncateAddress(flags.evmWallet.publicKey, 8, 6)}
                      </a>
                      <CopyBtn
                        text={flags.evmWallet.publicKey}
                        copied={lastCopiedText === flags.evmWallet.publicKey}
                        onCopy={copy}
                      />
                      <a
                        href={getExplorerAddressUrl(flags.evmWallet.publicKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-(--widget-muted) hover:text-(--widget-primary) transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                      {fmt(walletBal)}{" "}
                      <span className="text-[10px] font-normal text-(--widget-muted)">
                        USDC
                      </span>
                    </span>
                  </div>

                  {/* Send form */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={transferAmount}
                      onChange={(e) => onTransferAmountChange(e.target.value)}
                      placeholder="Amount"
                      mono
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onTransfer}
                      loading={isTransferring}
                      disabled={!transferAmount.trim()}
                      className="h-[38px]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </Button>
                  </div>
                </div>
              ) : user.email ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-(--widget-muted)">
                    No wallet provisioned
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCreateWallet}
                    loading={isCreatingWallet}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Wallet
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-(--widget-muted)">
                  No email on account
                </span>
              )}
            </DrawerCard>

            {/* Vault section */}
            <DrawerCard
              title="Vault"
              icon={<Shield className="w-4 h-4" />}
              action={
                flags.hasVault && flags.vaultId && vaultBal === 0 ? (
                  <button
                    type="button"
                    onClick={onDeleteVault}
                    disabled={isDeletingVault}
                    className="p-1 rounded text-(--widget-muted) hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-50"
                    title="Remove vault"
                  >
                    {isDeletingVault ? (
                      <Spinner size="sm" className="w-3.5 h-3.5" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : undefined
              }
            >
              {flags.hasVault && flags.vaultAddress ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <a
                        href={getExplorerAddressUrl(flags.vaultAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-(--widget-muted) hover:text-(--widget-primary) truncate transition-colors"
                        title={flags.vaultAddress}
                      >
                        {truncateAddress(flags.vaultAddress, 8, 6)}
                      </a>
                      <CopyBtn
                        text={flags.vaultAddress}
                        copied={lastCopiedText === flags.vaultAddress}
                        onCopy={copy}
                      />
                      <a
                        href={getExplorerAddressUrl(flags.vaultAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-(--widget-muted) hover:text-(--widget-primary) transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                      {fmt(vaultBal)}{" "}
                      <span className="text-[10px] font-normal text-(--widget-muted)">
                        USDC
                      </span>
                    </span>
                  </div>

                  {flags.vaultId && vaultBal > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onSweep}
                      loading={isSweeping}
                      className="w-full"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      Sweep to Omnibus
                    </Button>
                  )}
                </div>
              ) : user.email ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-(--widget-muted)">
                    No vault provisioned
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCreateVault}
                    loading={isCreatingVault}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Vault
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-(--widget-muted)">
                  No email on account
                </span>
              )}
            </DrawerCard>

            {/* Delete section */}
            <div>
              {!confirmDelete ? (
                <Button
                  size="sm"
                  variant="outline"
                  danger
                  onClick={() => onConfirmDeleteChange(true)}
                  className="w-full"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete User
                </Button>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700 mb-3">
                    This will permanently delete the user from Dynamic
                    {flags.vaultId ? " and hide their Fireblocks vault" : ""}.
                    This cannot be undone.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onConfirmDeleteChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onDelete}
                      loading={isDeleting}
                    >
                      Confirm Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Shared Components                                                        *
 * ═══════════════════════════════════════════════════════════════════════════ */

function DrawerCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-(--widget-border) bg-(--widget-row-bg)/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-(--widget-muted)">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-(--widget-muted)">
            {title}
          </span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function CopyBtn({
  text,
  copied,
  onCopy,
}: {
  text: string;
  copied: boolean;
  onCopy: (text: string, e?: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => onCopy(text, e)}
      className="p-0.5 rounded text-(--widget-muted) hover:text-(--widget-fg) cursor-pointer transition-colors shrink-0"
      title="Copy address"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-(--widget-success)" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function Badge({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
        active ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-600"
      }`}
    >
      {children}
    </span>
  );
}

function PageHeader({
  title,
  count,
  description,
  search,
  action,
}: {
  title: string;
  count?: number;
  description?: string;
  search?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold">{title}</h1>
          {typeof count === "number" && (
            <span className="text-xs font-medium tabular-nums px-2 py-0.5 rounded-full bg-(--widget-row-bg) text-(--widget-muted) border border-(--widget-border)">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {search}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
      {description && (
        <p className="text-sm text-(--widget-muted) mt-1">{description}</p>
      )}
    </div>
  );
}
