"use client";

import { useState } from "react";
import { Button, Input } from "@dynamic-demos/ui";
import { AdminCard } from "./admin-card";
import { TxStatusBadge } from "./tx-status-badge";
interface TxResult {
  id: string;
  status: string;
  txHash?: string;
}

interface FundFormProps {
  omnibusVaultId: string;
  defaultAssetId: string;
}

export function FundForm({ omnibusVaultId, defaultAssetId }: FundFormProps) {
  const [sourceVaultId, setSourceVaultId] = useState(omnibusVaultId);
  const [destVaultId, setDestVaultId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: defaultAssetId,
          source: { type: "VAULT_ACCOUNT", id: sourceVaultId },
          destination: { type: "VAULT_ACCOUNT", id: destVaultId },
          amount,
          note: note || `Fund transfer: ${amount} USDC`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create transfer");

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit transfer",
      );
    }
    setIsSubmitting(false);
  };

  return (
    <AdminCard
      title="Fund User Vault"
      description="Transfer USDC from omnibus vault to a user vault (VAULT_ACCOUNT to VAULT_ACCOUNT)"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Source Vault ID (Omnibus)"
          type="text"
          value={sourceVaultId}
          onChange={(e) => setSourceVaultId(e.target.value)}
          placeholder="vault-0"
        />
        <Input
          label="Destination Vault ID"
          type="text"
          value={destVaultId}
          onChange={(e) => setDestVaultId(e.target.value)}
          placeholder="vault-123"
        />
        <Input
          label="Amount (USDC)"
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
        />
        <Input
          label="Note (optional)"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Fund user vault"
        />
        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          disabled={!sourceVaultId || !destVaultId || !amount}
        >
          Submit Fund Transfer
        </Button>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 rounded bg-green-50 border border-green-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Transaction Created</span>
            <TxStatusBadge status={result.status} />
          </div>
          <p className="text-xs font-mono text-(--widget-muted)">
            ID: {result.id}
          </p>
          {result.txHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-(--widget-accent) hover:underline"
            >
              View on Explorer
            </a>
          )}
        </div>
      )}
    </AdminCard>
  );
}
