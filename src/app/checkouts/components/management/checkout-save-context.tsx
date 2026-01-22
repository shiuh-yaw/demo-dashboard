"use client";

/**
 * Checkout Save Context
 *
 * Provides save state management for the checkout settings editor.
 * Allows the header to show a save button when there are unsaved changes.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  startTransition,
  type ReactNode,
} from "react";

interface SaveState {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
}

interface CheckoutSaveContextValue {
  saveState: SaveState;
  updateSaveState: (state: SaveState) => void;
  triggerSave: () => Promise<void>;
  setSaveHandler: (handler: (() => Promise<void>) | null) => void;
}

const CheckoutSaveContext = createContext<CheckoutSaveContextValue | null>(
  null
);

export function CheckoutSaveProvider({ children }: { children: ReactNode }) {
  const [saveState, setSaveState] = useState<SaveState>({
    hasUnsavedChanges: false,
    isSaving: false,
  });
  // Use ref instead of state to avoid render issues
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const updateSaveState = useCallback((state: SaveState) => {
    // Use startTransition to mark this as a non-urgent update
    // This prevents "Cannot update component while rendering" errors
    startTransition(() => {
      setSaveState(state);
    });
  }, []);

  const triggerSave = useCallback(async () => {
    if (saveHandlerRef.current) {
      await saveHandlerRef.current();
    }
  }, []);

  const setSaveHandler = useCallback(
    (handler: (() => Promise<void>) | null) => {
      saveHandlerRef.current = handler;
    },
    []
  );

  return (
    <CheckoutSaveContext.Provider
      value={{
        saveState,
        updateSaveState,
        triggerSave,
        setSaveHandler,
      }}
    >
      {children}
    </CheckoutSaveContext.Provider>
  );
}

export function useCheckoutSave() {
  const context = useContext(CheckoutSaveContext);
  if (!context) {
    return null;
  }
  return context;
}
