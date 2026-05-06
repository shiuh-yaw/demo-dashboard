"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@dynamic-demos/ui";

interface RemoveWalletModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveWalletModal({
  onCancel,
  onConfirm,
}: RemoveWalletModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-(--brand-surface) rounded-(--brand-radius-lg) shadow-xl w-full max-w-sm">
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-(--brand-fg) mb-2">
            Remove wallet?
          </h2>
          <p className="text-sm text-(--brand-muted) mb-6 leading-relaxed">
            This will disconnect your stablecoin wallet. You can set up a new
            one at any time.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-(--brand-error) hover:opacity-90"
              onClick={onConfirm}
            >
              Remove wallet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
