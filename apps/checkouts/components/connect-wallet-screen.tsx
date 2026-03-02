"use client";

/**
 * Connect Wallet Screen Component
 *
 * A reusable, composable wallet connection UI that combines
 * the WidgetCard container with WalletSelectorScreen content.
 *
 * ## Usage
 *
 * This component is used in both:
 * - **PaymentWidget**: For connecting wallets before making deposits/payments
 * - **EmbeddedWalletWidget**: For signing in to view the embedded wallet
 *
 * ## Connection Flow
 *
 * 1. User sees wallet list (MetaMask, WalletConnect, etc.)
 * 2. User clicks a wallet → may need to select chain
 * 3. Wallet connection initiated → `onSuccess` called on completion
 *
 * @example
 * ```tsx
 * <ConnectWalletScreen
 *   title="Connect Wallet"
 *   subtitle="Choose how you would like to pay"
 *   onSuccess={() => setScreen("assets")}
 *   onBack={handleBack}
 *   selectedWalletForChain={selectedWallet}
 *   onNavigateToChainSelect={setSelectedWallet}
 * />
 * ```
 */

import { WidgetCard } from "@dynamic-demos/ui";
import WalletSelectorScreen, {
  type WalletGroup,
} from "./payment-modal/wallet-selector-screen";
import type { ExchangeProvider } from "@/lib/exchanges";

// Re-export WalletGroup type for consumers
export type { WalletGroup };

// =============================================================================
// TYPES
// =============================================================================

interface ConnectWalletScreenProps {
  /** Title for the header (default: "Connect Wallet") */
  title?: string;
  /** Subtitle for the header */
  subtitle?: string;
  /** Called when a wallet is successfully connected */
  onSuccess?: () => void;
  /** Called when back button is pressed (also used for WalletConnect cancel) */
  onBack?: () => void;
  /** Called when close button is pressed */
  onClose?: () => void;
  /** Whether the card is transitioning (for animations) */
  isTransitioning?: boolean;
  /** Currently selected wallet for chain selection (null = show wallet list) */
  selectedWalletForChain?: WalletGroup | null;
  /** Called when user clicks a wallet that supports multiple chains */
  onNavigateToChainSelect?: (wallet: WalletGroup) => void;
  /** Called when WalletConnect QR modal state changes */
  onWalletConnectStateChange?: (
    isActive: boolean,
    cancelFn: (() => void) | null,
  ) => void;
  /** Exchange providers to show as funding options */
  exchanges?: ExchangeProvider[];
  /** Called when an exchange is selected */
  onExchangeSelect?: (exchange: ExchangeProvider) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================
export default function ConnectWalletScreen({
  title = "Connect Wallet",
  subtitle = "Choose how you would like to connect",
  onSuccess,
  onBack,
  onClose,
  isTransitioning,
  selectedWalletForChain,
  onNavigateToChainSelect,
  onWalletConnectStateChange,
  exchanges,
  onExchangeSelect,
}: ConnectWalletScreenProps) {
  return (
    <WidgetCard
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      onClose={onClose}
      isTransitioning={isTransitioning}
    >
      <WalletSelectorScreen
        onSuccess={onSuccess}
        selectedWalletForChain={selectedWalletForChain}
        onNavigateToChainSelect={onNavigateToChainSelect}
        onWalletConnectStateChange={onWalletConnectStateChange}
        exchanges={exchanges}
        onExchangeSelect={onExchangeSelect}
      />
    </WidgetCard>
  );
}
