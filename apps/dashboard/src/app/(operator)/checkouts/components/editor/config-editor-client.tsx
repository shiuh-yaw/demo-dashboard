"use client";

/**
 * Client-side Checkout Config Editor
 *
 * Handles all client-side interactions, state management, and form updates.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useCheckoutConfig } from "../../hooks/use-checkout-config";
import { EditorHeader } from "./editor-header";
import { WidgetPreview } from "./widget-preview";
import { BasicSettings } from "./basic-settings";
import { AppearanceSettings } from "./appearance-settings";
import { ProductSettings } from "./product-settings";
import { Toast } from "./toast";
import type { StoredCheckoutConfig } from "@/lib/types/dashboard";

interface ConfigEditorClientProps {
  id: string;
  initialConfig: StoredCheckoutConfig | null;
  /** Hide the header when used in tabbed view (dashboard provides its own) */
  hideHeader?: boolean;
  /** Callback when save state changes (for parent to show save button) */
  onSaveStateChange?: (state: {
    hasUnsavedChanges: boolean;
    isSaving: boolean;
  }) => void;
  /** External save trigger (parent can call this) */
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export function ConfigEditorClient({
  id,
  initialConfig,
  hideHeader = false,
  onSaveStateChange,
  onSaveRef,
}: ConfigEditorClientProps) {
  const isNewCheckout = id === "new";

  const {
    storedConfig,
    config,
    name,
    isSaving,
    error,
    toast,
    hasUnsavedChanges,
    setConfig,
    setName,
    setToast,
    handleSave,
    updateConfig,
    updateTheme,
    updateBranding,
    updatePaymentPage,
  } = useCheckoutConfig({ id, isNewCheckout, initialConfig });

  // Report save state to parent when in tabbed view
  useEffect(() => {
    if (hideHeader && onSaveStateChange) {
      onSaveStateChange({ hasUnsavedChanges, isSaving });
    }
  }, [hideHeader, hasUnsavedChanges, isSaving, onSaveStateChange]);

  // Expose save function to parent
  useEffect(() => {
    if (onSaveRef) onSaveRef.current = handleSave;

    return () => {
      if (onSaveRef) onSaveRef.current = null;
    };
  }, [onSaveRef, handleSave]);

  // Get the actual checkout ID (from stored config after save, or from URL if existing)
  const savedCheckoutId = storedConfig?.id || (!isNewCheckout ? id : undefined);

  if (error || !config) {
    return (
      <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 text-[#dc2626]">
        {error || "Config not found"}
        <Link href="/checkouts" className="ml-2 underline hover:no-underline">
          Back to Checkouts
        </Link>
      </div>
    );
  }

  const isOrphaned =
    !isNewCheckout && !!initialConfig && !initialConfig.ownerId;

  return (
    <div>
      {!hideHeader && (
        <EditorHeader
          name={name}
          id={id}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isOrphaned={isOrphaned}
          onNameChange={setName}
          onSave={handleSave}
        />
      )}

      {/* Content - Two Column Layout */}
      <div className="flex gap-6">
        {/* Editor Panel */}
        <div className="flex-1 max-w-xl">
          <div className="space-y-5">
            <BasicSettings config={config} updateConfig={updateConfig} />

            <ProductSettings
              config={config}
              updateBranding={updateBranding}
              updatePaymentPage={updatePaymentPage}
            />

            <AppearanceSettings
              config={config}
              updateTheme={updateTheme}
              updateBranding={updateBranding}
              setConfig={setConfig}
              setToast={setToast}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <WidgetPreview config={config} widgetId={savedCheckoutId} />
      </div>

      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
