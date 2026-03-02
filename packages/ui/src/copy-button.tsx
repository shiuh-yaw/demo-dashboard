"use client";

import { useState, useCallback } from "react";
import { cn } from "@dynamic-demos/utils";
import { Tooltip } from "./tooltip";

/** Copy icon SVG */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

/** Check icon SVG */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export type CopyButtonSize = "sm" | "md";

export interface CopyButtonProps {
  /** Text to copy to clipboard */
  text: string;
  /** Button size (sm = 12px icons, md = 16px icons) */
  size?: CopyButtonSize;
  /** Accessible label */
  label?: string;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Additional class names */
  className?: string;
  /** Callback after successful copy */
  onCopy?: () => void;
}

const SIZE_CLASSES: Record<CopyButtonSize, { button: string; icon: string }> = {
  sm: { button: "p-0.5", icon: "w-3 h-3" },
  md: { button: "p-2", icon: "w-4 h-4" },
};

/**
 * Copy-to-clipboard button with success feedback.
 * Shows check icon briefly after copying.
 */
function CopyButton({
  text,
  size = "md",
  label = "Copy to clipboard",
  showTooltip = false,
  className = "",
  onCopy,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const styles = SIZE_CLASSES[size];

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        onCopy?.();
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    },
    [text, onCopy]
  );

  const button = (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "rounded hover:bg-black/5",
        "text-[var(--widget-muted,#9a9a9a)] hover:text-[var(--widget-fg,#000000)]",
        "transition-colors cursor-pointer",
        styles.button,
        className
      )}
      aria-label={label}
    >
      {copied ? (
        <CheckIcon
          className={cn(styles.icon, "text-[var(--widget-success,#22c55e)]")}
        />
      ) : (
        <CopyIcon className={styles.icon} />
      )}
    </button>
  );

  if (showTooltip) {
    return <Tooltip content={copied ? "Copied!" : label}>{button}</Tooltip>;
  }

  return button;
}

export { CopyButton };
