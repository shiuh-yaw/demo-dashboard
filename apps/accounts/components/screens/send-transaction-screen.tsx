"use client";

/**
 * Send from a business-account wallet.
 *
 * One call covers every chain - picking an asset picks whether a `token` is
 * passed, and that is the only shape difference between sending ETH and
 * sending USDC. On EVM with project sponsorship on, the send is routed through
 * Dynamic's native EIP-7702 relayer instead, so a treasury holding only USDC
 * can still move it (`lib/dynamic/gasless.ts`).
 *
 * No address validation beyond "not empty": the chains here encode addresses
 * five different ways, and a client-side check that is wrong for one of them
 * blocks a valid send. The chain rejects a bad recipient, and that rejection
 * is the honest error.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Pencil, Zap } from "lucide-react";
import {
  Button,
  CopyButton,
  Input,
  NetworkSelect,
  SelectMenu,
  Spinner,
  TextButton,
  Tooltip,
  WidgetCard,
} from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { addressPlaceholderFor } from "@/lib/chains";
import { Mono } from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import {
  useAccountWalletAccounts,
  useActiveNetwork,
} from "@/hooks/use-wallet-accounts";
import { useNetworkOptions } from "@/hooks/use-networks";
import {
  useSendTransaction,
  useSwitchNetwork,
  useTokenBalances,
} from "@/hooks/use-wallet-actions";
import {
  canSponsorSolanaTransfer,
  canSponsorTransfer,
  findSignableWallet,
} from "@/lib/dynamic";
import type {
  BusinessAccountWalletSummary,
  SendStage,
  TokenBalance,
} from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function SendTransactionScreen({
  businessAccountId,
  wallet,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("send");

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [assetKey, setAssetKey] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualDecimals, setManualDecimals] = useState("18");
  // Real progress, reported by the sponsored path as each step lands.
  const [stage, setStage] = useState<SendStage | null>(null);

  const { walletAccounts } = useAccountWalletAccounts(businessAccountId);
  const signable = findSignableWallet(walletAccounts, wallet);
  const { networkData } = useActiveNetwork(signable);
  const networkOptions = useNetworkOptions(signable?.chain ?? wallet.chain);
  const switchNetwork = useSwitchNetwork();
  const { data: tokens = [], isLoading: tokensLoading } = useTokenBalances(
    signable,
    networkData?.networkId,
  );
  const send = useSendTransaction();
  // EVM delegates via EIP-7702, Solana has its fee payer replaced
  // server-side. Different mechanisms, one thing to say on screen.
  const sponsored =
    canSponsorTransfer(signable) || canSponsorSolanaTransfer(signable);
  const rpcUrl = networkData?.rpcUrls?.http?.[0];

  const address = signable?.address ?? wallet.publicKey ?? "";
  const nativeSymbol = networkData?.nativeCurrency?.symbol;
  const networkIconUrl = networkData?.iconUrl;
  const nativeDecimals = networkData?.nativeCurrency?.decimals ?? 18;

  /**
   * What the picker offers.
   *
   * The native currency is synthesised from the network rather than taken from
   * the balances call, so the picker exists even when that call returns
   * nothing - which it does on a wallet that has never held anything, exactly
   * the wallet a demo starts with.
   */
  const assets: TokenBalance[] = useMemo(() => {
    const fromBalances = tokens.filter((token) => !token.isNative);
    const native =
      tokens.find((token) => token.isNative) ??
      ({
        symbol: nativeSymbol ?? signable?.chain ?? "Native",
        decimals: nativeDecimals,
        balance: 0,
        // The network's own icon - the balances API has no entry to take one
        // from when the wallet has never held anything.
        logoUrl: networkIconUrl,
        isNative: true,
      } satisfies TokenBalance);
    return [native, ...fromBalances];
  }, [tokens, nativeSymbol, nativeDecimals, networkIconUrl, signable?.chain]);

  // Default to the native asset, and re-default when the network changes - the
  // previous network's token is not on this one.
  useEffect(() => {
    if (assetKey === MANUAL_ASSET) return;
    if (assets.some((token) => keyOf(token) === assetKey)) return;
    const first = assets[0];
    if (first) setAssetKey(keyOf(first));
  }, [assets, assetKey]);

  const isManual = assetKey === MANUAL_ASSET;
  const listed = assets.find((token) => keyOf(token) === assetKey) ?? null;
  const asset = isManual ? null : listed;
  const hash = send.data?.transactionHash;

  const manualDecimalsNumber = Number(manualDecimals);
  const manualValid =
    manualAddress.trim() !== "" &&
    Number.isInteger(manualDecimalsNumber) &&
    manualDecimalsNumber >= 0 &&
    manualDecimalsNumber <= 36;

  const amountNumber = Number(amount);
  // Zero is allowed: a zero-value transfer is a real thing to send - it proves
  // the wallet can transact, and on EVM it is how a contract call with no value
  // is expressed. Only a negative or unparseable amount is refused.
  const amountValid =
    amount.trim() !== "" && Number.isFinite(amountNumber) && amountNumber >= 0;
  const overBalance =
    asset != null && amountValid && amountNumber > asset.balance;
  const canSubmit =
    Boolean(signable) &&
    recipient.trim() !== "" &&
    amountValid &&
    !overBalance &&
    (!isManual || manualValid) &&
    !send.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!signable || !canSubmit) return;

    void send
      .mutateAsync({
        walletAccount: signable,
        amount: amount.trim(),
        recipient: recipient.trim(),
        // Native transfers pass no token - that is the entire difference.
        token: isManual
          ? {
              address: manualAddress.trim(),
              decimals: manualDecimalsNumber,
            }
          : asset && !asset.isNative && asset.address
            ? { address: asset.address, decimals: asset.decimals }
            : undefined,
        nativeDecimals,
        rpcUrl,
        chain: signable.chain,
        isNative: !isManual && (asset?.isNative ?? true),
        onStage: setStage,
      })
      .catch(() => {
        // Rendered below from the mutation's error.
      })
      .finally(() => setStage(null));
  };

  if (hash) {
    const explorerUrl = networkData?.blockExplorerUrls?.[0];
    const assetLabel = isManual ? "" : (asset?.symbol ?? "");

    return (
      <WidgetCard
        icon={
          <span className="flex h-full w-full items-center justify-center">
            <Check className="h-[18px] w-[18px] text-emerald-600" strokeWidth={2.5} />
          </span>
        }
        title="Transaction Sent"
        subtitle="Your transaction was submitted successfully"
      >
        <div className="flex flex-col gap-3">
          {/* Amount and network in one card: they are a single statement -
              how much moved, and where. Two cards made them read as unrelated
              facts stacked by accident. */}
          <div className="flex flex-col rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg)">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs text-(--brand-muted)">Amount</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-sm font-medium tabular-nums text-(--brand-fg)">
                    {amount}
                  </span>
                  <span className="text-sm text-(--brand-muted)">
                    {assetLabel}
                  </span>
                </span>
              </span>
              {sponsored && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-(--brand-primary)">
                  <Zap className="h-3.5 w-3.5" strokeWidth={2} />
                  Gas sponsored
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 border-t border-(--brand-border) px-3 py-2.5">
              {networkData?.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={networkData.iconUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 rounded-full"
                />
              )}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs text-(--brand-muted)">Network</span>
                <span className="truncate text-sm font-medium text-(--brand-fg)">
                  {networkData?.displayName ?? signable?.chain ?? wallet.chain}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs text-(--brand-muted)">
                Transaction Hash
              </span>
              <Mono title={hash} className="min-w-0 text-(--brand-fg)">
                {truncateAddress(hash)}
              </Mono>
            </span>
            <CopyButton text={hash} size="md" label="Copy transaction hash" />
            {/* Beside the copy icon rather than a row of its own: both do the
                same kind of thing to the same hash, and a full-width button
                for it outranked the two decisions actually on this screen. */}
            {explorerUrl && (
              <Tooltip content="View on explorer">
                <a
                  href={`${explorerUrl.replace(/\/$/, "")}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on explorer"
                  className="shrink-0 rounded p-2 text-(--brand-muted) transition-colors hover:bg-black/5 hover:text-(--brand-fg)"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Tooltip>
            )}
          </div>

          {/* One row: leaving is a step back, not a decision competing with
              sending again, so it is an arrow rather than a second full-width
              button shouting alongside it. */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="secondary"
              aria-label="Back to wallet"
              className="w-11 shrink-0 px-0"
              onClick={() =>
                navigation.goToWalletTransactions(businessAccountId, wallet)
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                send.reset();
                setAmount("");
                setRecipient("");
              }}
            >
              Send another
            </Button>
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Send Transaction"
      subtitle={
        <span className="flex items-center gap-1.5">
          From {truncateAddress(address)}
          <CopyButton text={address} size="sm" label="Copy address" />
        </span>
      }
      onBack={() => navigation.goToWalletTransactions(businessAccountId, wallet)}
      className="overflow-visible"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Switchable here, not just displayed: the network decides which
            balances load and where the transfer lands, so changing your mind
            about it should not mean backing out of the form. */}
        <div className="flex items-center justify-between gap-2 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2.5">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-(--brand-fg)">
              Network
            </span>
            {/* Only where it is true, and it is load-bearing here: a treasury
                holding USDC and no ETH can still send, because Dynamic's
                relayer pays. */}
            {sponsored && (
              <span className="flex items-center gap-1 text-xs font-medium text-(--brand-primary)">
                <Zap className="h-3.5 w-3.5" strokeWidth={2} />
                Gas Sponsored
              </span>
            )}
          </span>
          <NetworkSelect
            value={String(networkData?.networkId ?? "")}
            options={networkOptions}
            align="end"
            className="text-sm"
            disabled={!signable || switchNetwork.isPending}
            onChange={(id) => {
              if (!signable) return;
              void switchNetwork
                .mutateAsync({ walletAccount: signable, networkId: id })
                .catch(() => {
                  // Rendered below from the mutation's error.
                });
            }}
          />
        </div>

        <ErrorMessage error={switchNetwork.error} />

        <Input
          label="Recipient Address"
          noAutofill
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          placeholder={addressPlaceholderFor(signable?.chain ?? wallet.chain)}
          autoFocus
          disabled={send.isPending}
        />

        <div className="flex flex-col gap-1.5">
          {isManual ? (
            /* Its own labelled panel, not two unlabelled boxes squeezed under
               the amount row: naming a contract and its decimals is a
               different job from typing an amount, and the inline version left
               "Token contract addr…" truncated in a half-width field. */
            <div className="flex flex-col gap-3 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-3">
              <Input
                label="Token Address"
                noAutofill
                value={manualAddress}
                onChange={(event) => setManualAddress(event.target.value)}
                placeholder="Enter address"
                mono
                disabled={send.isPending}
              />
              <Input
                label="Token Decimals"
                noAutofill
                value={manualDecimals}
                onChange={(event) => setManualDecimals(event.target.value)}
                placeholder="18"
                inputMode="numeric"
                disabled={send.isPending}
              />
              <Input
                label="Amount"
                noAutofill
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                disabled={send.isPending}
              />
              <TextButton
                className="self-start text-sm"
                icon={<ArrowLeft className="h-3.5 w-3.5" />}
                onClick={() => {
                  const first = assets[0];
                  if (first) setAssetKey(keyOf(first));
                }}
              >
                Back to asset list
              </TextButton>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-(--brand-muted)">
                  Amount
                </span>
                <TextButton
                  className="text-sm"
                  disabled={!asset || send.isPending}
                  aria-label="Use the full balance"
                  onClick={() => asset && setAmount(String(asset.balance))}
                >
                  {tokensLoading
                    ? "Balance …"
                    : `Balance: ${asset?.balance ?? 0}`}
                </TextButton>
              </div>

              {/* Amount and asset are one control, not two: they are a single
                  quantity, and splitting them into separate bordered boxes
                  made the asset read as an unrelated setting. */}
              <div className="flex h-10 items-center rounded-lg border border-(--brand-border) bg-(--brand-surface,#fff) focus-within:border-(--brand-primary)">
                <Input
                  value={amount}
                  noAutofill
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="h-full flex-1 rounded-none border-0 bg-transparent focus:border-0"
                  disabled={send.isPending}
                />
                <SelectMenu
                  value={assetKey}
                  onChange={setAssetKey}
                  align="end"
                  aria-label="Asset"
                  disabled={send.isPending}
                  className="mr-1 w-auto"
                  options={[
                    ...assets.map((token) => ({
                      value: keyOf(token),
                      // Balance belongs in the open list, where there is room
                      // for it and it answers "which of these can I actually
                      // spend". The trigger drops it - the row above already
                      // shows the selected asset's balance.
                      label: (
                        <span className="flex min-w-0 items-center gap-2">
                          <AssetIcon token={token} />
                          <span className="min-w-0 flex-1 truncate">
                            {token.symbol}
                          </span>
                          <span className="shrink-0 tabular-nums text-(--brand-muted)">
                            {token.balance}
                          </span>
                        </span>
                      ),
                      triggerLabel: (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <AssetIcon token={token} />
                          <span className="truncate">{token.symbol}</span>
                        </span>
                      ),
                    })),
                    // The balances API only knows tokens the wallet already
                    // holds, so a fresh treasury being sent its first asset
                    // would have no way to name it. Typing the contract
                    // covers that.
                    {
                      value: MANUAL_ASSET,
                      label: (
                        <span className="flex min-w-0 items-center gap-1.5 text-(--brand-muted)">
                          <Pencil className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            Enter address manually
                          </span>
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </>
          )}

          {overBalance && (
            <p className="text-[11px] text-(--brand-error)">
              More than this wallet holds.
            </p>
          )}
        </div>

        {/* Not `Button`'s `loading`: that swaps the children out for a bare
            spinner, so the step this is on would be invisible - which is the
            one thing worth saying while the chain takes its time. */}
        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {send.isPending ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              {STAGE_LABELS[stage ?? "signing"]}
            </>
          ) : (
            "Send Transaction"
          )}
        </Button>

        {!signable && !tokensLoading && (
          <p className="text-[11px] leading-relaxed text-(--brand-muted)">
            You hold no signing share for this wallet, so it cannot be sent
            from here. A signer on it can.
          </p>
        )}

        <ErrorMessage error={send.error} />
      </form>
    </WidgetCard>
  );
}

/** Native has no address, so the symbol stands in as its key. */
function keyOf(token: TokenBalance): string {
  return token.address ?? `native:${token.symbol}`;
}

/** Token mark, falling back to nothing rather than a broken image. */
function AssetIcon({ token }: { token: TokenBalance }) {
  if (!token.logoUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={token.logoUrl}
      alt=""
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-full"
    />
  );
}

/** Sentinel for "not in the list - I will type the contract myself". */
const MANUAL_ASSET = "__manual__";

/**
 * What the button says while a send is in flight.
 *
 * One spinner, in the button, wearing the step as its label - a second
 * spinner under it said nothing the first one did not. The unsponsored path
 * reports no stages, so it sits on "Signing" throughout, which is true of it.
 */
const STAGE_LABELS: Record<SendStage, string> = {
  signing: "Signing…",
  relaying: "Handing to the relayer…",
  confirming: "Waiting for the chain…",
};
