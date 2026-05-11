"use client";

import { useState } from "react";
import { Plus, Copy, Check } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";

interface DepositAddress {
  address: string;
  description?: string;
  tag?: string;
  type?: string;
  customerRefId?: string;
}

interface VaultAddressesProps {
  vaultId: string;
  defaultAssetId: string;
  initialAddresses: DepositAddress[];
}

export function VaultAddresses({
  vaultId,
  defaultAssetId,
  initialAddresses,
}: VaultAddressesProps) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [isCreating, setIsCreating] = useState(false);
  const { copied, copy } = useCopyFeedback();

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`/api/admin/vaults/${vaultId}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Admin-created deposit address",
          assetId: defaultAssetId,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as DepositAddress;
        setAddresses((prev) => [...prev, created]);
      }
    } catch {
      // Error handled
    }
    setIsCreating(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Deposit Addresses</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          loading={isCreating}
        >
          <Plus className="w-3.5 h-3.5" />
          New Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <p className="text-xs text-(--brand-muted)">
          No deposit addresses. Create one to receive funds.
        </p>
      ) : (
        <div className="space-y-1">
          {addresses.map((addr, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded bg-(--brand-row-bg)"
            >
              <div>
                <p className="text-xs font-mono">
                  {truncateAddress(addr.address, 12, 8)}
                </p>
                {addr.description && (
                  <p className="text-xs text-(--brand-muted)">
                    {addr.description}
                  </p>
                )}
                {addr.customerRefId && (
                  <p className="text-xs text-(--brand-muted)">
                    User: {truncateAddress(addr.customerRefId)}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => copy(addr.address, e)}
                className="text-(--brand-muted) hover:text-(--brand-fg) p-1 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-(--brand-success)" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
