"use client";

/**
 * Deposit form body - ported from the OSS reference
 * (nextjs-stablecoin-card-rain/components/dynamic-card/fund-card.tsx),
 * restyled off the Dialog into a plain in-card form for the paginated
 * Deposit screen (`components/dynamic-card/screens/deposit.tsx`). Still
 * wired onto `useFundCard` (EIP-7702 gasless RUSDC transfer straight from
 * the user's own embedded wallet to their Rain deposit address, hard rule
 * 3: the app never calls Rain directly) and `useRusdcBalance` for the
 * wallet balance shown as "Max".
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input } from "@dynamic-demos/ui";
import { isEvmWalletAccount } from "@dynamic-labs-sdk/evm";
import { useGetWalletAccounts } from "@dynamic-labs-sdk/react-hooks";
import type { WalletAccount } from "@dynamic-labs-sdk/client";

import { useTrack } from "@dynamic-demos/analytics";
import { useFundCard } from "@/hooks/use-fund-card";
import { useRusdcBalance } from "@/hooks/use-rusdc-balance";
import { trackedDeposit } from "@/lib/analytics/flows";

const PRESET_AMOUNTS = [5, 10, 25];

export interface DepositFormProps {
  /** Called after a successful deposit - navigates back to the main screen. */
  onSuccess: () => void;
}

export function DepositForm({ onSuccess }: DepositFormProps) {
  const { data: walletAccounts = [] } = useGetWalletAccounts();
  // useGetWalletAccounts' return type is hardcoded to BaseWalletAccount<Chain>
  // rather than the module-augmented WalletAccount alias - cast to bridge it
  // (same fix as apps/wallet/hooks/use-wallet-accounts.ts and
  // apps/card/hooks/use-fund-card.ts).
  const walletAccount = (walletAccounts as WalletAccount[]).find(
    isEvmWalletAccount,
  );
  const { formatted } = useRusdcBalance(walletAccount?.address);
  const walletBalance = Number(formatted ?? "0");

  const { fund, isFunding, error } = useFundCard();
  const { milestone } = useTrack();

  const [amount, setAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const numericAmount = Number(amount);
  const isValidAmount =
    amount !== "" &&
    !Number.isNaN(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= walletBalance;

  const handlePreset = (value: number | "max") => {
    setAmount(value === "max" ? (formatted ?? "0") : value.toString());
    setShowCustomInput(false);
  };

  const handleDeposit = async () => {
    if (!isValidAmount || isFunding) return;
    // deposit_initiated fires before the transfer; deposit_completed only
    // after it resolves (trackedDeposit). onSuccess runs after both.
    await trackedDeposit(milestone, amount, () => fund(amount));
    onSuccess();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        {PRESET_AMOUNTS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={
              !showCustomInput && amount === preset.toString()
                ? "primary"
                : "outline"
            }
            onClick={() => handlePreset(preset)}
            disabled={isFunding || preset > walletBalance}
          >
            ${preset}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={
            !showCustomInput &&
            walletBalance > 0 &&
            amount === (formatted ?? "0")
              ? "primary"
              : "outline"
          }
          onClick={() => handlePreset("max")}
          disabled={isFunding || walletBalance <= 0}
        >
          Max
        </Button>
      </div>

      {!showCustomInput ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => {
            setShowCustomInput(true);
            setAmount("");
          }}
          disabled={isFunding}
        >
          Custom amount
        </Button>
      ) : (
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-(--brand-muted)">
            $
          </span>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Custom amount"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value.replace(/[^0-9.]/g, ""))
            }
            className="pl-6"
            autoFocus
            disabled={isFunding}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-(--brand-error)" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        className="w-full"
        onClick={() => void handleDeposit()}
        disabled={!isValidAmount || isFunding}
      >
        {isFunding ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Depositing...
          </>
        ) : isValidAmount ? (
          `Deposit $${amount}`
        ) : (
          "Enter an amount"
        )}
      </Button>
    </div>
  );
}
