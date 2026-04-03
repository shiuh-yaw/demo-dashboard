"use client";

import { CheckCircle, ExternalLink, XCircle } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import type { TokenInfo } from "./token-select-step";

const CHAIN_EXPLORERS: Record<string, string> = {
  "1": "https://etherscan.io",
  "8453": "https://basescan.org",
  "42161": "https://arbiscan.io",
  "84532": "https://sepolia.basescan.org",
  "11155111": "https://sepolia.etherscan.io",
};

interface SendResultStepProps {
  token: TokenInfo;
  amount: string;
  txHash: string | null;
  networkId: string;
  error: string | null;
  onDone: () => void;
  onRetry: () => void;
}

export function SendResultStep({
  token,
  amount,
  txHash,
  networkId,
  error,
  onDone,
  onRetry,
}: SendResultStepProps) {
  const explorerBase = CHAIN_EXPLORERS[networkId];
  const isMockTx = txHash === "mock-tx";
  const explorerUrl =
    txHash && !isMockTx && explorerBase
      ? `${explorerBase}/tx/${txHash}`
      : null;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <XCircle size={48} className="text-red-500" />
        <p className="text-lg font-semibold text-trade-text-primary">
          Send Failed
        </p>
        <p className="text-sm text-trade-text-muted text-center max-w-xs">
          {error}
        </p>
        <Button onClick={onRetry} className="w-full">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <CheckCircle size={48} className="text-trade-success" />
      <p className="text-lg font-semibold text-trade-text-primary">
        Sent Successfully
      </p>
      <p className="text-sm text-trade-text-muted">
        {amount} {token.symbol} sent
      </p>

      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-trade-accent hover:underline"
        >
          View on Explorer
          <ExternalLink size={14} />
        </a>
      )}

      <Button onClick={onDone} className="w-full mt-2">
        Done
      </Button>
    </div>
  );
}
