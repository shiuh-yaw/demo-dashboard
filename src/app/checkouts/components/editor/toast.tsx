"use client";

/**
 * Toast Notification Component
 *
 * Auto-dismisses after a configurable duration.
 */

import { useEffect } from "react";
import { Check } from "lucide-react";

interface ToastProps {
  message: string;
  /** Called when the toast should be dismissed */
  onClose: () => void;
  /** Duration in ms before auto-dismiss (default: 3000) */
  duration?: number;
}

export function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-4 right-4 bg-[#0e121b] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
      <Check className="w-4 h-4 text-[#22c55e]" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
