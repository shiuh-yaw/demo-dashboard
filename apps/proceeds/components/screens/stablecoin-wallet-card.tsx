"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  ArrowUpDown,
  Plus,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { Button, Spinner } from "@dynamic-demos/ui";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { useUSDCBalance } from "@/hooks/use-usdc-balance";
import { useActiveNetwork } from "@/hooks/use-active-network";
import {
  isSignedIn,
  getWalletAccounts,
  getEvmWalletAccount,
  getSmartWalletAccount,
  onEvent,
  offEvent,
  getWalletMeta,
  updateWalletMeta,
  registerPasskey,
  hasRegisteredPasskeys,
} from "@/lib/dynamic";
import type { NetworkData } from "@dynamic-labs-sdk/client";
import { getUsdcAddress } from "@/lib/network-config";
import { truncateAddress } from "@/lib/format";
import { DetailRow } from "@/components/ui/detail-row";
import { LinkButton } from "@/components/ui/link-button";
import { PanelButton, PanelLinkButton } from "@/components/ui/panel-button";
import { NetworkSwitcher } from "@/components/dashboard/network-switcher";

import { TransferModal } from "./transfer-modal";
import { AddFundsModal } from "./add-funds-modal";
import { RecoveryModal } from "./recovery-modal";
import { RemoveWalletModal } from "./remove-wallet-modal";
import { CreateWalletModal } from "./create-wallet-modal";

const COPIED_FEEDBACK_MS = 2000;
const MOCK_CARD_LAST_FOUR = "4821";

export function StablecoinWalletCard() {
  const clientReady = useClientInitialized();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  // EOA address is kept separately — needed for Dynamic wallet metadata ops
  // (getWalletMeta / updateWalletMeta are keyed to the EOA, not the kernel account)
  const [eoaAddress, setEoaAddress] = useState<string | null>(null);
  const [walletVersion, setWalletVersion] = useState(0);

  const [copied, setCopied] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);

  const refreshWalletState = useCallback(async () => {
    const smartWallet = getSmartWalletAccount(); // EIP-4337 kernel account
    const primary = getEvmWalletAccount(); // EOA (signer)
    const accounts = getWalletAccounts();

    if (!primary && accounts.length === 0) {
      if (!isSignedIn()) {
        setWalletAddress(null);
        setEoaAddress(null);
      }
      return;
    }

    // Dynamic metadata (deleted flag, crypto card) is keyed to the EOA.
    const eoa = primary?.address ?? accounts[0]?.address ?? null;
    if (eoa) {
      const meta = getWalletMeta(eoa);
      if (meta?.deleted) {
        setWalletAddress(null);
        setEoaAddress(null);
        setHasCard(false);
        return;
      }
      setHasCard(!!meta?.cryptoCard);
    }
    setEoaAddress(eoa);

    // Use kernel account for receiving USDC and executing transfers.
    // Falls back to EOA while the smart wallet extension is still loading.
    const address = smartWallet?.address ?? eoa;
    setWalletAddress(address);
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    refreshWalletState().catch(() => {});
  }, [clientReady, walletVersion, refreshWalletState]);

  useEffect(() => {
    const listener = () => setWalletVersion((v) => v + 1);
    onEvent({ event: "walletAccountsChanged", listener });
    return () => {
      offEvent({ event: "walletAccountsChanged", listener });
    };
  }, []);

  /* ---------- Network state ---------- */

  // The active EVM network lives in `ActiveNetworkProvider` so the wallet
  // card and the header pill render the exact same value. Dynamic owns the
  // underlying chain state — the provider just mirrors it into React.
  const {
    networks,
    active: activeNetworkData,
    switching: networkSwitching,
    error: networkError,
    switchTo: handleSwitchNetwork,
  } = useActiveNetwork();

  // Balance + transfer follow the user-selected network.
  // `NetworkData.networkId` is a string — coerce to number for the balance
  // API and viem-based transfer.
  const activeChainId = activeNetworkData
    ? Number(activeNetworkData.networkId)
    : null;
  const balanceNetwork =
    walletAddress && activeChainId
      ? { chain: "EVM", networkId: activeChainId }
      : undefined;

  const {
    raw: balanceRaw,
    formatted: balanceFormatted,
    usdValue: balanceUsd,
    isLoading: balanceLoading,
    isFetching: balanceFetching,
    refetch: balanceRefetch,
  } = useUSDCBalance(walletAddress, balanceNetwork);

  /* ---------- Passkey state ---------- */

  const [hasPasskey, setHasPasskey] = useState(false);
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");

  useEffect(() => {
    if (!clientReady || !isSignedIn()) return;
    let cancelled = false;
    hasRegisteredPasskeys().then((has) => {
      if (!cancelled) setHasPasskey(has);
    });
    return () => {
      cancelled = true;
    };
  }, [clientReady, walletAddress, walletVersion]);

  async function handleRegisterPasskey() {
    setPasskeyRegistering(true);
    setPasskeyError("");
    try {
      await registerPasskey();
      setHasPasskey(true);
      setWalletVersion((v) => v + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (
        lower.includes("cancel") ||
        lower.includes("abort") ||
        lower.includes("not allowed")
      ) {
        // User cancelled — silent.
      } else if (lower.includes("authorization") || lower.includes("401")) {
        setPasskeyError(
          "Passkey MFA isn't enabled for this Dynamic environment.",
        );
      } else {
        setPasskeyError(msg.slice(0, 140));
      }
    } finally {
      setPasskeyRegistering(false);
    }
  }

  /* ---------- Render ---------- */

  const hasWallet = !!walletAddress;

  if (!clientReady) {
    return (
      <div className="card">
        <div className="card-body flex items-center justify-center py-10">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!hasWallet) {
    return (
      <EmptyState onCreate={() => setShowCreateWallet(true)}>
        <CreateWalletModal
          isOpen={showCreateWallet}
          onClose={() => setShowCreateWallet(false)}
          onWalletCreated={() => setWalletVersion((v) => v + 1)}
        />
      </EmptyState>
    );
  }

  const truncatedAddr = truncateAddress(walletAddress);

  const handleCopy = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard may be blocked in some browser contexts; fail silently.
    }
  };

  const toggleCard = async () => {
    if (!eoaAddress) return;
    if (hasCard) {
      await updateWalletMeta(eoaAddress, { cryptoCard: undefined });
      setHasCard(false);
    } else {
      await updateWalletMeta(eoaAddress, {
        cryptoCard: {
          lastFour: MOCK_CARD_LAST_FOUR,
          createdAt: new Date().toISOString(),
        },
      });
      setHasCard(true);
    }
  };

  const handleRemoveWallet = async () => {
    if (eoaAddress) {
      await updateWalletMeta(eoaAddress, {
        deleted: true,
        cryptoCard: undefined,
      });
    }
    setWalletAddress(null);
    setEoaAddress(null);
    setHasCard(false);
    setShowRemoveConfirm(false);
  };

  return (
    <>
      <div className="card" style={{ overflow: "hidden" }}>
        <PanelHeader
          network={activeNetworkData}
          balance={balanceLoading ? null : (balanceUsd ?? "$0.00")}
          isRefreshing={balanceFetching}
          onRefresh={() => balanceRefetch()}
        />

        <ActionBar
          onTransfer={() => setShowTransfer(true)}
          onAddFunds={() => setShowAddFunds(true)}
        />

        <dl>
          <DetailRow
            label="Wallet address"
            value={
              <span className="font-mono text-[13px] text-(--brand-fg) tabular-nums">
                {truncatedAddr}
              </span>
            }
            action={
              <LinkButton
                onClick={handleCopy}
                tone={copied ? "success" : "primary"}
              >
                {copied ? "Copied" : "Copy"}
              </LinkButton>
            }
          />

          <DetailRow
            label="Network"
            value={
              <div className="flex items-center gap-2">
                {activeNetworkData?.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeNetworkData.iconUrl}
                    alt=""
                    className="w-4 h-4 rounded"
                  />
                )}
                <span>
                  {activeNetworkData?.displayName ??
                    networks[0]?.displayName ??
                    "—"}
                </span>
              </div>
            }
            error={networkError ?? undefined}
            action={
              <NetworkSwitcher
                variant="inline"
                networks={networks}
                active={activeNetworkData}
                switching={networkSwitching}
                onSelect={handleSwitchNetwork}
              />
            }
          />

          <DetailRow
            label="Biometric binding"
            value={
              <span
                style={{
                  color: hasPasskey
                    ? "var(--brand-success)"
                    : "var(--brand-muted)",
                  fontWeight: hasPasskey ? 500 : 400,
                }}
              >
                {hasPasskey ? "Touch ID · Active" : "Not set up"}
              </span>
            }
            hint="Required to authorize transfers"
            error={passkeyError || undefined}
            action={
              hasPasskey ? null : passkeyRegistering ? (
                <Spinner size="sm" />
              ) : (
                <LinkButton onClick={handleRegisterPasskey}>Set up</LinkButton>
              )
            }
          />

          <DetailRow
            label="Linked payment card"
            value={
              hasCard ? (
                <span className="tabular-nums">•••• {MOCK_CARD_LAST_FOUR}</span>
              ) : (
                <span className="text-(--brand-muted)">Not linked</span>
              )
            }
            hint="Add a card to iPhone to spend USDC at local merchants"
            action={
              <LinkButton
                tone={hasCard ? "danger" : "primary"}
                onClick={toggleCard}
              >
                {hasCard ? "Remove" : "Add to iPhone"}
              </LinkButton>
            }
          />

          <DetailRow
            label="Recovery contact"
            value={
              <span className="text-(--brand-muted)">Not configured</span>
            }
            hint="Optional · helps regain access if you lose your device"
            action={
              <LinkButton onClick={() => setShowRecovery(true)}>Add</LinkButton>
            }
          />
        </dl>

        <PanelFooter onRemove={() => setShowRemoveConfirm(true)} />
      </div>

      {showRemoveConfirm && (
        <RemoveWalletModal
          onCancel={() => setShowRemoveConfirm(false)}
          onConfirm={handleRemoveWallet}
        />
      )}

      {showTransfer && activeChainId && (
        <TransferModal
          onClose={() => setShowTransfer(false)}
          onSuccess={() => balanceRefetch()}
          balance={balanceFormatted}
          balanceRaw={balanceRaw}
          usdcAddress={getUsdcAddress(activeChainId)}
          chainId={activeChainId}
        />
      )}

      {showRecovery && <RecoveryModal onClose={() => setShowRecovery(false)} />}

      {showAddFunds && <AddFundsModal onClose={() => setShowAddFunds(false)} />}
    </>
  );
}

/* ---------- Subcomponents ---------- */

function EmptyState({
  onCreate,
  children,
}: {
  onCreate: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body flex flex-col items-center justify-center gap-3 py-8">
          <StablecoinIcon />
          <p className="text-[13px] text-(--brand-muted)">
            No stablecoin wallet configured
          </p>
          <Button onClick={onCreate}>Add stablecoin wallet</Button>
        </div>
      </div>
      {children}
    </>
  );
}

function PanelHeader({
  network,
  balance,
  isRefreshing,
  onRefresh,
}: {
  network: NetworkData | null;
  balance: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-start gap-4 px-7 py-5 border-b border-(--brand-border)">
      <StablecoinIcon />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-semibold text-(--brand-fg)">
            Stablecoin (USDC)
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2 py-0.5"
            style={{
              color: "var(--brand-status-completed-fg)",
              background: "var(--brand-status-completed-bg)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--brand-accent)" }}
            />
            Connected
          </span>
        </div>
        <div className="text-[13px] text-(--brand-muted) mt-0.5 leading-relaxed">
          Monthly App Store proceeds are pushed here as USDC on{" "}
          {network?.displayName ?? "Ethereum"}. Your balance stays onchain until
          you transfer or spend it.
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-(--brand-muted) uppercase tracking-wider">
          <span>Balance</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing || balance === null}
            aria-label="Refresh balance"
            title="Refresh balance"
            className="p-0.5 -mr-0.5 rounded hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors disabled:opacity-50"
          >
            <RotateCcw
              className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        {balance === null ? (
          <div className="animate-pulse h-6 w-24 bg-(--brand-row-bg) rounded mt-1" />
        ) : (
          <div className="text-[20px] font-semibold text-(--brand-fg) tabular-nums tracking-tight mt-0.5">
            {balance}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBar({
  onTransfer,
  onAddFunds,
}: {
  onTransfer: () => void;
  onAddFunds: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-7 py-3 border-b border-(--brand-border)"
      style={{ background: "var(--brand-strip-bg)" }}
    >
      <PanelLinkButton
        icon={<Eye className="w-3.5 h-3.5" />}
        label="View transactions"
        href="/reports?tab=onchain"
      />
      <PanelButton
        icon={<ArrowUpDown className="w-3.5 h-3.5" />}
        label="Transfer"
        onClick={onTransfer}
      />
      <PanelButton
        icon={<Plus className="w-3.5 h-3.5" />}
        label="Add funds"
        onClick={onAddFunds}
      />
      <div className="flex-1" />
      <span className="text-[11px] text-(--brand-muted)">
        Last reconciled · just now
      </span>
    </div>
  );
}

function PanelFooter({ onRemove }: { onRemove: () => void }) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-7 py-3 border-t border-(--brand-border)"
      style={{ background: "var(--brand-strip-bg)" }}
    >
      <button
        type="button"
        onClick={onRemove}
        className="text-[12px] text-(--brand-muted) bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-(--brand-error)"
      >
        Remove wallet
      </button>
    </div>
  );
}

function StablecoinIcon() {
  // iOS Settings-row treatment: flat colored tile with a single centered SF
  // Symbol-style glyph. No gradient, no text glyph — Apple's Settings app
  // never uses literal text characters as icons.
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white"
      style={{ background: "var(--brand-primary)" }}
      aria-hidden
    >
      <Wallet className="w-[18px] h-[18px]" strokeWidth={2.25} />
    </div>
  );
}

