"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { useMockMode } from "@/contexts/mock-mode-context";
import type { NetworkData } from "@/lib/dynamic";
import type { TokenInfo } from "./token-select-step";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface ConfirmStepProps {
  token: TokenInfo;
  recipient: string;
  amount: string;
  network: NetworkData;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
}

export function ConfirmStep({
  token,
  recipient,
  amount,
  network,
  onConfirm,
  isPending,
  error,
}: ConfirmStepProps) {
  const { isMockMode } = useMockMode();
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-trade-surface-blue border border-trade-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-trade-bg flex items-center justify-center">
              <Image
                src={token.image}
                alt={token.name}
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <span className="text-sm font-medium text-trade-text-primary">
              {token.name}
            </span>
          </div>
          <span className="text-sm font-semibold text-trade-text-primary tabular-nums">
            {amount} {token.symbol}
          </span>
        </div>

        <div className="border-t border-trade-border/40" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-trade-text-muted">To</span>
          <span
            className="text-sm font-medium text-trade-text-primary font-mono"
            title={recipient}
          >
            {truncateAddress(recipient)}
          </span>
        </div>

        {!isMockMode && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-trade-text-muted">Network</span>
            <span className="text-sm font-medium text-trade-text-primary">
              {network.displayName ?? network.networkId}
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <Button
        onClick={onConfirm}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sending...
          </>
        ) : (
          "Confirm Send"
        )}
      </Button>
    </div>
  );
}
