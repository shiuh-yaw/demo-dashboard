"use client";

import { useState, useMemo } from "react";
import type { MorphoVault } from "@/lib/api/vaults";
import { useMockMode } from "@/contexts/mock-mode-context";
import { useMockBalances } from "@/hooks/use-mock-balances";
import { MyVaultsSection } from "./my-vaults-section";
import { VaultList } from "./vault-list";
import { VaultModal } from "./vault-modal";

interface EarnClientProps {
  vaults: MorphoVault[];
}

export function EarnClient({ vaults }: EarnClientProps) {
  const [selectedVault, setSelectedVault] = useState<MorphoVault | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { isMockMode } = useMockMode();
  const { balances } = useMockBalances();

  const filteredVaults = useMemo(() => {
    if (!isMockMode) return vaults;
    return vaults.filter((v) => {
      const amount = balances[v.asset.symbol.toUpperCase()]?.amount ?? 0;
      return amount > 0;
    });
  }, [vaults, isMockMode, balances]);

  const handleVaultClick = (vault: MorphoVault) => {
    setSelectedVault(vault);
    setModalOpen(true);
  };

  return (
    <>
      <MyVaultsSection />
      <VaultList
        vaults={filteredVaults}
        onVaultClick={handleVaultClick}
        emptyMessage={
          isMockMode && filteredVaults.length === 0 && vaults.length > 0
            ? "No vaults match your available assets. Swap to get USDC, USDT, or other supported tokens."
            : undefined
        }
      />
      <VaultModal
        vault={selectedVault}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
