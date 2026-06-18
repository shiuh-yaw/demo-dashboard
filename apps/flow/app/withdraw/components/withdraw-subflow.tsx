"use client";

/**
 * Withdraw sub-flow inside the platform shell.
 *
 * Stages:
 *   settlement  → ChainPicker → TokenPicker (which token+chain to receive)
 *   form        → DestinationForm           (external address + amount)
 *   pay         → PaymentWidget             (creates Flow at review, then sign + settle)
 *
 * Source asset is always USDC@Solana (the platform anchor); the
 * embedded wallet only holds USDC, so the asset picker is intentionally
 * omitted.
 */

import { useMemo, useState } from "react";
import {
  PaymentWidget,
  formatUsd,
  getChainIcon,
  type Token,
} from "@dynamic-demos/checkouts-widget";
import { Button } from "@dynamic-demos/ui";
import { ArrowRight } from "@/components/icons";
import { DYNAMIC_DESTINATION_ADDRESS_PATTERN } from "@/lib/checkouts-api";
import { bindCreateFlow } from "@/lib/bind-create-flow";
import type { WalletAccount } from "@/lib/dynamic/flow-sdk";
import {
  CHAIN_OPTIONS,
  SETTLEMENT_OPTIONS,
  USDC_ON_SOLANA,
  type SettlementOption,
} from "../settlement-options";
import { SubFlowHeader } from "./sub-flow-chrome";

type WithdrawStage = "settlement" | "form" | "pay";

export function WithdrawSubFlow({
  walletAccount,
  usdcBalanceUsd,
  balanceLoading,
  onDone,
}: {
  walletAccount: WalletAccount;
  usdcBalanceUsd: number;
  balanceLoading: boolean;
  onDone: () => void;
}) {
  const [pickerChainKey, setPickerChainKey] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementOption | null>(null);
  const [destination, setDestination] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [fromToken, setFromToken] = useState<Token | null>(null);

  let stage: WithdrawStage;
  if (!settlement) stage = "settlement";
  else if (!destination || !amount || !fromToken) stage = "form";
  else stage = "pay";

  const createFlow = useMemo(() => {
    if (!settlement || !destination) return undefined;
    return bindCreateFlow({
      mode: "withdraw",
      destinationAddress: destination,
      destinationChain: settlement.chainFamily,
      asset: settlement.symbol,
      chain: settlement.chainKey,
    });
  }, [settlement, destination]);

  const destinationToken = useMemo<Token | null>(
    () =>
      settlement
        ? {
            address: settlement.tokenAddress,
            chainId: settlement.chainId,
            symbol: settlement.symbol,
            decimals: settlement.decimals,
            name: settlement.symbol,
            logoURI: settlement.iconUrl,
          }
        : null,
    [settlement],
  );

  const { needsConversion, isCrossChain } = useMemo(() => {
    if (!fromToken || !destinationToken) {
      return { needsConversion: false, isCrossChain: false };
    }
    const sameChain = fromToken.chainId === destinationToken.chainId;
    const sameAddress =
      fromToken.address.toLowerCase() ===
      destinationToken.address.toLowerCase();
    return {
      needsConversion: !sameAddress || !sameChain,
      isCrossChain: !sameChain,
    };
  }, [fromToken, destinationToken]);

  if (stage === "settlement") {
    const inTokenPicker = !!pickerChainKey;
    const chosenChain = inTokenPicker
      ? CHAIN_OPTIONS.find((c) => c.chainKey === pickerChainKey)
      : null;
    return (
      <div className="flex flex-col">
        <SubFlowHeader
          eyebrow="Withdraw"
          title={inTokenPicker ? "Pick a token" : "Pick a network"}
          subtitle={
            inTokenPicker
              ? `Tokens available on ${chosenChain?.chainLabel ?? "this network"}.`
              : "Pick the network your funds should land on."
          }
          onBack={inTokenPicker ? () => setPickerChainKey(null) : onDone}
        />
        {inTokenPicker ? (
          <TokenPicker chainKey={pickerChainKey!} onSelect={setSettlement} />
        ) : (
          <ChainPicker onSelect={setPickerChainKey} />
        )}
      </div>
    );
  }

  if (stage === "form") {
    return (
      <div className="flex flex-col">
        <SubFlowHeader
          eyebrow={`Withdraw ${settlement!.symbol} on ${settlement!.chainLabel}`}
          title="Send to a wallet"
          subtitle="The recipient gets this token on the chosen chain."
          onBack={() => setSettlement(null)}
        />
        <DestinationForm
          settlement={settlement!}
          usdcBalanceUsd={usdcBalanceUsd}
          balanceLoading={balanceLoading}
          initialAddress={destination}
          initialAmount={amount}
          onSubmit={(values) => {
            setDestination(values.address);
            setAmount(values.amount);
            setFromToken(USDC_ON_SOLANA);
          }}
        />
      </div>
    );
  }

  return (
    <PaymentWidget
      key={`${fromToken!.chainId}-${fromToken!.address || fromToken!.symbol}`}
      createFlow={createFlow}
      walletAccount={walletAccount}
      currency="USD"
      destinationAddress={destination}
      destinationChain={settlement!.chainFamily}
      fromToken={fromToken!}
      destinationToken={destinationToken!}
      needsConversion={needsConversion}
      isCrossChain={isCrossChain}
      mode="withdraw"
      amount={amount}
      slippage={0.01}
      onCancelled={() => setFromToken(null)}
    />
  );
}

function ChainPicker({ onSelect }: { onSelect: (chainKey: string) => void }) {
  return (
    <div className="px-5 py-4 flex flex-col gap-1.5 max-h-[360px] overflow-y-auto">
      {CHAIN_OPTIONS.map((c) => {
        const Icon = getChainIcon(c.chainId);
        return (
          <button
            key={c.chainKey}
            type="button"
            onClick={() => onSelect(c.chainKey)}
            className="flex items-center justify-between gap-3 rounded-xl bg-(--brand-row-bg) px-4 py-3 text-left transition-colors hover:bg-(--brand-row-hover) [&_*]:pointer-events-none"
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-(--brand-border) overflow-hidden">
                {Icon ? (
                  <Icon className="h-6 w-6" />
                ) : (
                  <span className="text-[9px] font-mono font-semibold text-(--brand-muted)">
                    {c.chainLabel.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[14px] font-semibold text-(--brand-fg)">
                  {c.chainLabel}
                </span>
                <span className="text-[11px] text-(--brand-muted)">
                  {c.chainFamily === "SOL" ? "Solana network" : "EVM network"}
                </span>
              </span>
            </span>
            <ArrowRight />
          </button>
        );
      })}
    </div>
  );
}

function TokenPicker({
  chainKey,
  onSelect,
}: {
  chainKey: string;
  onSelect: (option: SettlementOption) => void;
}) {
  const tokens = SETTLEMENT_OPTIONS.filter((o) => o.chainKey === chainKey);
  return (
    <div className="px-5 py-4 flex flex-col gap-1.5 max-h-[360px] overflow-y-auto">
      {tokens.map((opt) => (
        <button
          key={`${opt.symbol}-${opt.chainKey}`}
          type="button"
          onClick={() => onSelect(opt)}
          className="flex items-center justify-between gap-3 rounded-xl bg-(--brand-row-bg) px-4 py-3 text-left transition-colors hover:bg-(--brand-row-hover) [&_*]:pointer-events-none"
        >
          <span className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opt.iconUrl}
                alt=""
                className="h-8 w-8 rounded-full bg-white object-cover"
              />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[14px] font-semibold text-(--brand-fg)">
                {opt.symbol}
              </span>
              <span className="text-[11px] text-(--brand-muted)">
                on {opt.chainLabel}
              </span>
            </span>
          </span>
          <ArrowRight />
        </button>
      ))}
    </div>
  );
}

function DestinationForm({
  settlement,
  usdcBalanceUsd,
  balanceLoading,
  initialAddress,
  initialAmount,
  onSubmit,
}: {
  settlement: SettlementOption;
  usdcBalanceUsd: number;
  balanceLoading: boolean;
  initialAddress: string;
  initialAmount: string;
  onSubmit: (value: { address: string; amount: string }) => void;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [amount, setAmount] = useState(initialAmount);
  const [touched, setTouched] = useState(false);

  const addressOk = DYNAMIC_DESTINATION_ADDRESS_PATTERN.test(address.trim());
  const amountNumber = parseFloat(amount);
  const amountOk = Number.isFinite(amountNumber) && amountNumber > 0;
  const canSubmit = addressOk && amountOk;
  const showAddressError = touched && !addressOk;
  const showAmountError = touched && !amountOk;

  const addressPlaceholder =
    settlement.chainFamily === "SOL" ? "Solana address" : "0x… (EVM address)";

  const MAX_BUTTON_SAFETY_MULTIPLIER = 0.99;
  const canUseMax = !balanceLoading && usdcBalanceUsd > 0;
  const handleMax = () => {
    if (!canUseMax) return;
    const withBuffer = usdcBalanceUsd * MAX_BUTTON_SAFETY_MULTIPLIER;
    const floored = Math.floor(withBuffer * 100) / 100;
    if (floored <= 0) return;
    setAmount(floored.toFixed(2));
  };

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;
        onSubmit({ address: address.trim(), amount: String(amountNumber) });
      }}
    >
      <div className="flex flex-col gap-4 px-5 py-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-(--brand-fg)">
            Destination address
          </span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={addressPlaceholder}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`rounded-lg border bg-(--brand-row-bg) px-3 py-2 text-[16px] font-mono text-(--brand-fg) placeholder:text-(--brand-muted) outline-none focus:ring-2 focus:ring-(--brand-primary) focus:ring-offset-1 ${
              showAddressError
                ? "border-red-400"
                : "border-(--brand-border)"
            }`}
          />
          {showAddressError && (
            <span className="text-[11px] text-red-600">
              Enter a valid{" "}
              {settlement.chainFamily === "SOL" ? "Solana" : "EVM"} address.
            </span>
          )}
        </label>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="withdraw-amount"
              className="text-[11px] font-medium text-(--brand-fg)"
            >
              Amount (USD)
            </label>
            {(balanceLoading || usdcBalanceUsd > 0) && (
              <button
                type="button"
                onClick={handleMax}
                disabled={!canUseMax}
                className="text-[11px] font-medium text-(--brand-primary) disabled:cursor-not-allowed disabled:text-(--brand-muted) hover:underline underline-offset-2"
              >
                {balanceLoading
                  ? "Loading balance…"
                  : `Max: ${formatUsd(usdcBalanceUsd)}`}
              </button>
            )}
          </div>
          <input
            id="withdraw-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`rounded-lg border bg-(--brand-row-bg) px-3 py-2 text-[16px] font-mono text-(--brand-fg) placeholder:text-(--brand-muted) outline-none focus:ring-2 focus:ring-(--brand-primary) focus:ring-offset-1 ${
              showAmountError
                ? "border-red-400"
                : "border-(--brand-border)"
            }`}
          />
          {showAmountError && (
            <span className="text-[11px] text-red-600">
              Enter an amount greater than 0.
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-[7px] px-5 py-3 border-t border-(--brand-border)">
        <Button
          type="submit"
          className="flex-1"
          disabled={touched && !canSubmit}
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
