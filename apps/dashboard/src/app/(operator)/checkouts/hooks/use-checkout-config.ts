/**
 * Custom Hook for Checkout Config Management
 *
 * Handles all state management and saving logic for checkout configurations.
 * Uses server actions for data persistence.
 *
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createWidgetConfig } from "@/lib/widget-config";
import {
  createCheckout,
  updateCheckout,
  getCheckout,
} from "@/lib/actions/checkouts";
import type { StoredCheckoutConfig, CheckoutMode } from "@/lib/types/dashboard";
import type {
  WidgetConfig,
  PaymentPageConfig,
  WidgetBranding,
  WidgetTheme,
} from "@/lib/widget-config";

interface UseCheckoutConfigOptions {
  id: string;
  isNewCheckout: boolean;
  initialConfig?: StoredCheckoutConfig | null;
}

interface UseCheckoutConfigReturn {
  // State
  storedConfig: StoredCheckoutConfig | null;
  config: WidgetConfig | null;
  name: string;
  description: string;
  mode: CheckoutMode;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  toast: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig | null>>;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  setMode: React.Dispatch<React.SetStateAction<CheckoutMode>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setToast: React.Dispatch<React.SetStateAction<string | null>>;
  handleSave: () => Promise<void>;
  updateConfig: <K extends keyof WidgetConfig>(
    key: K,
    value: WidgetConfig[K]
  ) => void;
  updateTheme: (key: keyof WidgetTheme, value: string) => void;
  updateBranding: (key: keyof WidgetBranding, value: string | boolean) => void;
  updatePaymentPage: (key: keyof PaymentPageConfig, value: string) => void;
}

// Constants
const TOAST_DURATION = 3000;

export function useCheckoutConfig({
  id,
  isNewCheckout,
  initialConfig,
}: UseCheckoutConfigOptions): UseCheckoutConfigReturn {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [storedConfig, setStoredConfig] = useState<StoredCheckoutConfig | null>(
    initialConfig ?? null
  );
  const [config, setConfig] = useState<WidgetConfig | null>(() => {
    if (isNewCheckout) return createWidgetConfig();
    if (initialConfig) return initialConfig.config;
    return null;
  });
  const [name, setName] = useState(initialConfig?.name || "");
  const [description, setDescription] = useState(
    initialConfig?.description || ""
  );
  const [mode, setMode] = useState<CheckoutMode>(
    initialConfig?.mode || initialConfig?.config?.mode || "payment"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Memoize trimmed name to avoid recalculating
  const trimmedName = useMemo(() => name.trim(), [name]);

  // Memoize expensive hasUnsavedChanges computation
  const hasUnsavedChanges = useMemo(() => {
    if (!storedConfig) {
      return trimmedName.length > 0;
    }

    if (!config) return false;

    // Compare individual fields instead of JSON.stringify for better performance
    const nameChanged = trimmedName !== storedConfig.name;
    const descriptionChanged =
      (description || "") !== (storedConfig.description || "");
    const modeChanged =
      mode !== (storedConfig.mode || storedConfig.config?.mode);

    // Only do deep comparison if other fields match (optimization)
    if (nameChanged || descriptionChanged || modeChanged) {
      return true;
    }

    // Deep comparison for config object (only when needed)
    return JSON.stringify(config) !== JSON.stringify(storedConfig.config);
  }, [storedConfig, config, trimmedName, description, mode]);

  // Fetch on client if we don't have initial data and it's not a new checkout
  useEffect(() => {
    if (!id || isNewCheckout || initialConfig) return;

    // Create abort controller for this fetch
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function fetchConfig() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await getCheckout(id);

        // Check if fetch was aborted
        if (abortController.signal.aborted) return;

        if (result.success) {
          setStoredConfig(result.data);
          setConfig(result.data.config);
          setName(result.data.name);
          setDescription(result.data.description || "");
          setMode(result.data.mode || result.data.config?.mode || "payment");
        } else {
          setError(result.error || "Failed to load config");
        }
      } catch (err) {
        // Don't set error if fetch was aborted
        if (abortController.signal.aborted) return;

        setError("Failed to connect to server");
        console.error("Failed to fetch config:", err);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchConfig();

    // Cleanup: abort fetch if component unmounts or dependencies change
    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [id, isNewCheckout, initialConfig]);

  // Auto-hide toast with proper cleanup
  useEffect(() => {
    // Clear any existing timer
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    if (toast) {
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, TOAST_DURATION);
    }

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [toast]);

  const handleSave = useCallback(async () => {
    if (!config) {
      setError("Configuration is required");
      return;
    }

    // Validation
    if (!trimmedName) {
      setError("Checkout name is required");
      setToast("Please enter a checkout name");
      return;
    }

    // Prevent concurrent saves
    if (isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      const isCreating = storedConfig === null;

      const result = isCreating
        ? await createCheckout(trimmedName, mode, config)
        : await updateCheckout(id, {
            name: trimmedName,
            description: description || undefined,
            mode,
            config,
          });

      if (result.success) {
        setStoredConfig(result.data);
        setToast("Configuration saved!");
        if (isCreating) {
          router.replace(`/checkouts/${result.data.id}`);
        }
      } else {
        setError(result.error || "Failed to save config");
        setToast(result.error || "Failed to save configuration");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save config";
      setError(errorMessage);
      setToast(errorMessage);
      console.error("Failed to save config:", err);
    } finally {
      setIsSaving(false);
    }
  }, [
    config,
    trimmedName,
    description,
    mode,
    storedConfig,
    id,
    router,
    isSaving,
  ]);

  const updateConfigField = useCallback(
    <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
      if (!config) return;
      setConfig((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: value };
      });
    },
    [config]
  );

  const updateTheme = useCallback(
    (key: keyof WidgetTheme, value: string) => {
      if (!config) return;
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          theme: { ...prev.theme, [key]: value },
        };
      });
    },
    [config]
  );

  const updateBranding = useCallback(
    (key: keyof WidgetBranding, value: string | boolean) => {
      if (!config) return;
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          branding: { ...prev.branding, [key]: value },
        };
      });
    },
    [config]
  );

  const updatePaymentPage = useCallback(
    (key: keyof PaymentPageConfig, value: string) => {
      if (!config) return;
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          paymentPage: { ...prev.paymentPage, [key]: value },
        };
      });
    },
    [config]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort any pending fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear any pending toast timer
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return {
    storedConfig,
    config,
    name,
    description,
    mode,
    isLoading,
    isSaving,
    error,
    toast,
    hasUnsavedChanges,
    setConfig,
    setName,
    setDescription,
    setMode,
    setError,
    setToast,
    handleSave,
    updateConfig: updateConfigField,
    updateTheme,
    updateBranding,
    updatePaymentPage,
  };
}
