"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { MockVaultPosition } from "@/lib/mock-metadata";
import { MOCK_METADATA_KEYS } from "@/lib/mock-metadata";
import { useMockMetadata } from "@/hooks/use-mock-metadata";
import { useMockMode } from "@/contexts/mock-mode-context";
import { MyVaultModal } from "./my-vault-modal";

function formatApy(value: number | null | undefined): string {
  if (value == null) return "--";
  return `${(value * 100).toFixed(2)}%`;
}

export function MyVaultsSection() {
  const [selectedPosition, setSelectedPosition] =
    useState<MockVaultPosition | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { isMockMode } = useMockMode();
  const { metadata } = useMockMetadata();
  const earn = metadata[MOCK_METADATA_KEYS.EARN] as
    | { deposits?: MockVaultPosition[] }
    | undefined;
  const deposits = earn?.deposits ?? [];

  if (!isMockMode || deposits.length === 0) return null;

  const handleRowClick = (pos: MockVaultPosition) => {
    setSelectedPosition(pos);
    setModalOpen(true);
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-trade-text-muted mb-3">
        My Vaults
      </h2>
      <div className="rounded-2xl overflow-hidden bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-trade-border/50 bg-trade-bg/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-trade-text-muted">
                  Vault
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                  Deposited
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                  APY
                </th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((pos) => (
                <tr
                  key={pos.id}
                  className="border-b border-trade-border/40 last:border-0 hover:bg-trade-surface-elevated transition-colors group cursor-pointer"
                  onClick={() => handleRowClick(pos)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3 group-hover:opacity-80 transition-opacity">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-trade-bg shrink-0">
                        {pos.assetLogoURI ? (
                          <Image
                            src={pos.assetLogoURI}
                            alt={pos.assetName}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs font-medium text-trade-text-muted">
                            {pos.assetSymbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-trade-text-primary">
                        {pos.vaultName}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm text-trade-text-secondary tabular-nums">
                      {pos.amount} {pos.assetSymbol}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-trade-text-primary tabular-nums">
                      {formatApy(pos.apy)}
                      <Sparkles className="w-3.5 h-3.5 text-trade-accent" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedPosition && (
        <MyVaultModal
          position={selectedPosition}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setSelectedPosition(null);
          }}
        />
      )}
    </div>
  );
}
