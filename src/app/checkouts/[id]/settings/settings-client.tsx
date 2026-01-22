"use client";

/**
 * Settings Page Client Component
 *
 * Wraps the ConfigEditorClient and connects it to the save context
 * so the header can show the save button when there are changes.
 */

import { useEffect, useRef, useCallback } from "react";
import { ConfigEditorClient } from "../../components/editor/config-editor-client";
import { useCheckoutSave } from "../../components/management/checkout-save-context";
import type { StoredCheckoutConfig } from "@/lib/types/dashboard";

interface SettingsClientProps {
  id: string;
  checkout: StoredCheckoutConfig | null;
}

export function SettingsClient({ id, checkout }: SettingsClientProps) {
  const saveContext = useCheckoutSave();
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const updateSaveStateRef = useRef(saveContext?.updateSaveState);

  // Keep ref updated with latest function
  useEffect(() => {
    updateSaveStateRef.current = saveContext?.updateSaveState;
  }, [saveContext?.updateSaveState]);

  // Connect save handler to context
  useEffect(() => {
    if (saveContext) {
      saveContext.setSaveHandler(() => {
        return saveRef.current?.() ?? Promise.resolve();
      });
    }
  }, [saveContext]);

  // Stable callback that uses ref to avoid dependency issues
  const handleSaveStateChange = useCallback(
    (state: { hasUnsavedChanges: boolean; isSaving: boolean }) => {
      // Use ref to call latest function without causing re-renders
      updateSaveStateRef.current?.(state);
    },
    [] // Empty deps - uses ref instead
  );

  return (
    <ConfigEditorClient
      id={id}
      initialConfig={checkout}
      hideHeader
      onSaveStateChange={handleSaveStateChange}
      onSaveRef={saveRef}
    />
  );
}
