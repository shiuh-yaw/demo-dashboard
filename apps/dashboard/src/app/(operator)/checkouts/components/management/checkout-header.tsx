"use client";

/**
 * Checkout Header Component
 *
 * Displays the header section for checkout pages including:
 * - Back button (on detail pages)
 * - Page title with mode badge
 * - Description (on overview tab)
 * - Action buttons (Save and Open Checkout)
 */

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { StoredCheckoutConfig } from "@/lib/types/dashboard";
import { demoThemeUrl } from "@/lib/share-links/launch-url";
import { useCheckoutSave } from "./checkout-save-context";

interface CheckoutHeaderProps {
  checkout: StoredCheckoutConfig;
  basePath: string;
  activeTab: string;
  isTransactionDetail: boolean;
}

export function CheckoutHeader({
  checkout,
  basePath,
  activeTab,
  isTransactionDetail,
}: CheckoutHeaderProps) {
  const saveContext = useCheckoutSave();
  const isSettingsTab = activeTab === "settings";
  const hasUnsavedChanges = saveContext?.saveState.hasUnsavedChanges ?? false;
  const isSaving = saveContext?.saveState.isSaving ?? false;
  const showSaveButton = isSettingsTab && hasUnsavedChanges;

  const checkoutMode = checkout.mode || checkout.config?.mode || "payment";

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Back button only on detail pages */}
          {isTransactionDetail && (
            <Link
              href={`${basePath}/transactions`}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Transactions</span>
            </Link>
          )}

          {/* Page Title */}
          <div className="flex items-center gap-3">
            {!isTransactionDetail && (
              <Link
                href="/checkouts"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Back to checkouts"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}
            <h1 className="text-2xl font-semibold text-slate-900">
              {isTransactionDetail ? "Transaction Details" : checkout.name}
            </h1>
            {!isTransactionDetail && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                  checkoutMode === "payment"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {checkoutMode}
              </span>
            )}
          </div>

          {/* Description - only on overview */}
          {!isTransactionDetail &&
            activeTab === "overview" &&
            checkout.description && (
              <p className="text-sm text-slate-500 mt-2">
                {checkout.description}
              </p>
            )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {showSaveButton && (
            <button
              onClick={() => saveContext?.triggerSave()}
              disabled={isSaving}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium text-white bg-[#4779FF] hover:bg-[#3968e8] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
          <a
            href={demoThemeUrl("checkout", checkout.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Checkout
          </a>
        </div>
      </div>
    </div>
  );
}
