"use client";

import { useEffect } from "react";
import { LogOut, Settings, Wallet } from "lucide-react";
import {
  WidgetCard,
  widgetHeaderTrailingIconButtonClassName,
  Button,
  Spinner,
} from "@dynamic-demos/ui";
import { useMilestoneOnce } from "@/hooks/use-milestone-once";
import { ScrollableWalletList } from "@/components/wallet/scrollable-wallet-list";
import { CreateWalletButtons } from "@/components/wallet/create-wallet-buttons";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useLogout } from "@/hooks/use-mutations";
import { getUniqueWalletAddresses } from "@/lib/wallet-utils";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface DashboardScreenProps {
  navigation: NavigationReturn;
}

/**
 * Dashboard screen showing wallet list and create options
 */
export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { walletAccounts, isLoading } = useWalletAccounts();
  const logoutMutation = useLogout();
  const milestoneOnce = useMilestoneOnce();
  // Q-017: while the wallets screen is up, the scenario page's code
  // panel shows the wallet-management steps.
  usePanelSectionEffect("wallets");

  // GTM Phase 09: `receive_viewed` - the wallet list stands in for a receive
  // screen (addresses shown with copy); session-deduped so remounts don't
  // inflate the signal. See AGENTS.md.
  useEffect(() => {
    milestoneOnce("receive_viewed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniqueWallets = getUniqueWalletAddresses(walletAccounts);

  const handleLogout = () => logoutMutation.mutateAsync();

  const handleSend = (address: string, chain: string) => {
    navigation.goToSendTx(address, chain);
  };

  const handleAuthorize = (address: string) => {
    // Go directly to send-tx - it handles authorization if needed
    navigation.goToSendTx(address, "EVM");
  };

  const handleSetupMfa = (address: string, chain: string) => {
    navigation.goToSetupMfa(address, chain);
  };

  const handleRowClick = (
    address: string,
    chain: string,
    networkId: number,
  ) => {
    navigation.goToTxHistory(address, chain, networkId);
  };

  const handleSignMessage = (address: string, chain: string) => {
    navigation.goToSignMessage(address, chain);
  };

  return (
    <WidgetCard
      icon={
        <Wallet
          className="w-[18px] h-[18px] text-(--brand-fg)"
          strokeWidth={1.5}
        />
      }
      title="Your Wallets"
      subtitle="Manage your embedded wallets"
      trailing={
        <button
          type="button"
          onClick={() => navigation.goToSettings()}
          className={widgetHeaderTrailingIconButtonClassName}
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <ScrollableWalletList
            wallets={uniqueWallets}
            onSend={handleSend}
            onAuthorize={handleAuthorize}
            onSetupMfa={handleSetupMfa}
            onRowClick={handleRowClick}
            onSignMessage={handleSignMessage}
          />
        )}

        <div className="h-px bg-(--brand-border)" />

        <div className="flex items-center gap-2">
          <CreateWalletButtons className="flex-1" navigation={navigation} />
          {/* Muted at rest to match Add Wallet beside it; `danger` still
              brings the red on hover. */}
          <Button
            variant="outline"
            size="icon"
            danger
            className="text-(--brand-muted)"
            onClick={handleLogout}
            loading={logoutMutation.isPending}
            aria-label="Sign out"
            title="Sign out"
          >
            {!logoutMutation.isPending && <LogOut className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </WidgetCard>
  );
}
