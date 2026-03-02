"use client";

/**
 * Confirm Modal Component
 *
 * A reusable confirmation dialog for destructive or important actions.
 */

import { Button } from "@dynamic-demos/ui";

interface ConfirmModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Called when the action is confirmed */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Modal description/message */
  description: React.ReactNode;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
  /** Variant for the confirm button */
  variant?: "danger" | "primary";
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  variant = "danger",
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmButtonClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-[#4779FF] hover:bg-[#3968e8] text-white";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        <div className="px-5 py-4">
          <div className="text-sm text-slate-600">{description}</div>
        </div>
        <div className="px-5 py-3 bg-slate-50 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="px-3 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-3 text-xs font-medium ${confirmButtonClass}`}
          >
            {isLoading ? "Loading..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
