"use client";

import { Plus } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface CreateWalletButtonsProps {
  className?: string;
  navigation: NavigationReturn;
}

/**
 * "Add Wallet" button that navigates to the add-wallet screen.
 */
export function CreateWalletButtons({
  className,
  navigation,
}: CreateWalletButtonsProps) {
  return (
    <button
      type="button"
      onClick={navigation.goToAddWallet}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 px-3 h-9",
        "bg-(--brand-row-bg) rounded-(--brand-radius)",
        "border border-(--brand-border)",
        "text-xs font-medium text-(--brand-muted)",
        "hover:bg-(--brand-row-hover) hover:text-(--brand-fg)",
        "transition-all cursor-pointer",
        className,
      )}
    >
      <Plus className="w-4 h-4" />
      Add Wallet
    </button>
  );
}
