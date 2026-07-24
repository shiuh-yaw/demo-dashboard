/**
 * Demo-kind list registry: the one seam that keeps `DemoKindListClient` a
 * single component. Per kind it declares page copy, route, empty-state icon,
 * delete copy, and the existing `delete{Kind}Config` action. Presentation
 * normalization only - no storage/action change; each entry wires the exact
 * strings its legacy list client already rendered.
 */

import { ArrowDownToLine, Banknote, CreditCard, LineChart, Send, Wallet, ArrowUpDown } from "lucide-react";
import { deleteWalletConfig } from "@/lib/actions/wallets";
import { deleteEarnConfig } from "@/lib/actions/earns";
import { deleteCheckout } from "@/lib/actions/checkouts";
import { deleteRemittanceConfig } from "@/lib/actions/remittance";
import { deleteTradeConfig } from "@/lib/actions/trade";
import { deleteVisaDirectConfig } from "@/lib/actions/visa-direct";
import type {
  StoredWalletConfig,
  StoredEarnConfig,
  StoredCheckoutConfig,
  StoredRemittanceConfig,
  StoredTradeConfig,
  StoredVisaDirectConfig,
} from "@/lib/types/dashboard";
import type { DemoKindListConfig } from "@/components/shared/demo-kind-list-client";

export const walletListConfig: DemoKindListConfig<StoredWalletConfig> = {
  kind: "wallet",
  pageTitle: "Wallets",
  routeBase: "/wallets",
  icon: Wallet,
  newButtonLabel: "New Config",
  createButtonLabel: "Create Config",
  emptyTitle: "No Wallet configs yet",
  emptyDescription:
    "Create your first Wallet config to customize the theme and branding.",
  deleteModalTitle: "Delete Wallet Config",
  deleteSuccessMessage: "Wallet config deleted",
  deleteFailureMessage: "Failed to delete config",
  deleteAction: deleteWalletConfig,
};

export const earnListConfig: DemoKindListConfig<StoredEarnConfig> = {
  kind: "earn",
  pageTitle: "Earn",
  routeBase: "/earns",
  icon: Banknote,
  newButtonLabel: "New Config",
  createButtonLabel: "Create Config",
  emptyTitle: "No Earn configs yet",
  emptyDescription:
    "Create your first Earn config to customize the theme and branding.",
  deleteModalTitle: "Delete Earn Config",
  deleteSuccessMessage: "Earn config deleted",
  deleteFailureMessage: "Failed to delete config",
  deleteAction: deleteEarnConfig,
};

function checkoutMode(config: StoredCheckoutConfig): string | undefined {
  return config.mode || config.config?.mode;
}

export const checkoutListConfig: DemoKindListConfig<StoredCheckoutConfig> = {
  kind: "checkout",
  pageTitle: "Checkouts",
  routeBase: "/checkouts",
  icon: ArrowUpDown,
  newButtonLabel: "New Checkout",
  createButtonLabel: "Create Checkout",
  emptyTitle: "No checkouts yet",
  emptyDescription:
    "Create your first checkout to start accepting payments or deposits.",
  deleteModalTitle: "Delete Checkout",
  deleteSuccessMessage: "Checkout deleted",
  deleteFailureMessage: "Failed to delete checkout",
  deleteAction: deleteCheckout,
  renderNameIcon: (item) => (
    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
      {checkoutMode(item) === "deposit" ? (
        <ArrowDownToLine className="w-3.5 h-3.5 text-muted-foreground" />
      ) : (
        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </div>
  ),
  extraColumn: {
    header: "Mode",
    render: (item) => {
      const mode = checkoutMode(item);
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${
            mode === "payment"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
          }`}
        >
          {mode}
        </span>
      );
    },
  },
};

export const remittanceListConfig: DemoKindListConfig<StoredRemittanceConfig> = {
  kind: "remittance",
  pageTitle: "Remittance",
  routeBase: "/remittance",
  icon: Send,
  newButtonLabel: "New Config",
  createButtonLabel: "Create Config",
  emptyTitle: "No Remittance configs yet",
  emptyDescription:
    "Create your first Remittance config to customize the theme and branding.",
  deleteModalTitle: "Delete Remittance Config",
  deleteSuccessMessage: "Remittance config deleted",
  deleteFailureMessage: "Failed to delete config",
  deleteAction: deleteRemittanceConfig,
};

export const tradeListConfig: DemoKindListConfig<StoredTradeConfig> = {
  kind: "trade",
  pageTitle: "Trade",
  routeBase: "/trade",
  icon: LineChart,
  newButtonLabel: "New Config",
  createButtonLabel: "Create Config",
  emptyTitle: "No Trade configs yet",
  emptyDescription:
    "Create your first Trade config to customize the theme and branding.",
  deleteModalTitle: "Delete Trade Config",
  deleteSuccessMessage: "Trade config deleted",
  deleteFailureMessage: "Failed to delete config",
  deleteAction: deleteTradeConfig,
};

export const visaDirectListConfig: DemoKindListConfig<StoredVisaDirectConfig> = {
  kind: "visa-direct",
  pageTitle: "Visa Direct",
  routeBase: "/visa-direct",
  icon: CreditCard,
  newButtonLabel: "New Config",
  createButtonLabel: "Create Config",
  emptyTitle: "No Visa Direct configs yet",
  emptyDescription:
    "Create your first Visa Direct config to customize the theme and branding.",
  deleteModalTitle: "Delete Visa Direct Config",
  deleteSuccessMessage: "Visa Direct config deleted",
  deleteFailureMessage: "Failed to delete config",
  deleteAction: deleteVisaDirectConfig,
};
