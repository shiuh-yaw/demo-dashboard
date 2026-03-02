"use client";

import { Wallet, Check, ChevronDown } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { truncateAddress } from "@dynamic-demos/utils";
import { getWalletDisplayInfo } from "@/lib/dynamic";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { type WalletAccount } from "@/lib/dynamic";

interface WalletSelectProps {
  wallets: WalletAccount[];
  selectedWallet: WalletAccount | null;
  onSelect: (wallet: WalletAccount) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function WalletSelect({
  wallets,
  selectedWallet,
  onSelect,
  open,
  onOpenChange,
  placeholder = "Select a wallet",
  disabled = false,
}: WalletSelectProps) {
  const handleSelect = (wallet: WalletAccount) => {
    onSelect(wallet);
    onOpenChange(false);
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left cursor-pointer",
            "border-earn-border/60 hover:bg-gray-50/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {selectedWallet ? (
            <>
              {(() => {
                const displayInfo = getWalletDisplayInfo(
                  selectedWallet.walletProviderKey
                );
                return (
                  <>
                    {displayInfo.iconUrl ? (
                      <img
                        src={displayInfo.iconUrl}
                        alt={displayInfo.name}
                        className="w-8 h-8 rounded-lg"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-earn-text-secondary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-earn-text-primary">
                        {displayInfo.name}
                      </p>
                      <p className="text-xs text-earn-text-secondary font-mono">
                        {truncateAddress(selectedWallet.address)}
                      </p>
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-earn-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-earn-text-primary">
                  {placeholder}
                </p>
              </div>
            </>
          )}
          <ChevronDown className="w-4 h-4 text-earn-text-secondary shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-2"
        align="start"
      >
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {wallets.map((wallet) => {
            const displayInfo = getWalletDisplayInfo(wallet.walletProviderKey);
            const isSelected = selectedWallet?.address === wallet.address;

            return (
              <button
                key={wallet.address}
                type="button"
                onClick={() => handleSelect(wallet)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left cursor-pointer",
                  isSelected
                    ? "border-earn-text-primary bg-gray-50"
                    : "border-earn-border/60 hover:bg-gray-50/50"
                )}
              >
                {displayInfo.iconUrl ? (
                  <img
                    src={displayInfo.iconUrl}
                    alt={displayInfo.name}
                    className="w-8 h-8 rounded-lg"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-earn-text-secondary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-earn-text-primary">
                    {displayInfo.name}
                  </p>
                  <p className="text-xs text-earn-text-secondary font-mono">
                    {truncateAddress(wallet.address)}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 text-earn-text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

