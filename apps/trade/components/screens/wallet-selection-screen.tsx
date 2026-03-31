"use client";

import { useCallback } from "react";
import {
  WalletSelectionScreen as UiWalletSelectionScreen,
  Spinner,
  WidgetCard,
} from "@dynamic-demos/ui";
import type { WalletOption } from "@dynamic-demos/ui";
import { useSetWalletType } from "@/hooks/use-wallet-selection";
import { useEnabledWalletOptions } from "@/hooks/use-enabled-wallet-options";

interface WalletSelectionScreenProps {
  onComplete: () => void;
}

/**
 * Trade wallet selection: uses shared WalletSelectionScreen from packages/ui.
 * Per Dynamic docs: only shows "External wallet" when user is connected via an external wallet.
 * @see https://www.dynamic.xyz/docs/react/wallets/external-wallets/external-wallets-overview
 */
export function WalletSelectionScreen({ onComplete }: WalletSelectionScreenProps) {
  const setWalletType = useSetWalletType();
  const enabledOptions = useEnabledWalletOptions();

  const handleSelect = useCallback(
    (option: WalletOption) => {
      setWalletType.mutate(option, {
        onSuccess: onComplete,
      });
    },
    [setWalletType, onComplete],
  );

  if (setWalletType.isPending) {
    const option = setWalletType.variables;
    const message =
      option === "embedded"
        ? "Creating embedded wallet..."
        : option === "fireblocks"
          ? "Creating Fireblocks vault..."
          : "Saving your selection...";

    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-(--widget-muted)">{message}</p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <UiWalletSelectionScreen
      enabledOptions={enabledOptions}
      onSelect={handleSelect}
      theme="widget"
    />
  );
}
