"use client";

import { cn } from "@dynamic-demos/utils";
import { ChevronRight } from "lucide-react";

interface OptionCardProps {
  /** Icon element to display */
  icon: React.ReactNode;
  /** Main title */
  title: string;
  /** Description text */
  description: string;
  /** Optional timing/subtitle text */
  timing?: string;
  /** Optional array of small icons/logos to display (e.g., exchange logos) */
  badges?: React.ReactNode[];
  /** Whether this option is selected */
  selected?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether to show the chevron arrow */
  showChevron?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Reusable option card component for selection lists.
 * Used in modals for destination selection, exchange selection, etc.
 */
export function OptionCard({
  icon,
  title,
  description,
  timing,
  badges,
  selected = false,
  disabled = false,
  onClick,
  showChevron = true,
  className,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 p-3 sm:p-4 border rounded-lg cursor-pointer transition-all duration-200 text-left bg-white flex-1",
        selected
          ? "border-earn-text-primary bg-earn-text-primary/5 ring-1 ring-earn-text-primary/20"
          : "border-earn-border/60 hover:border-earn-border hover:bg-gray-50/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-earn-text-primary">
          {title}
        </p>
        <p className="text-xs text-earn-text-secondary">
          {description}
        </p>
        {timing && (
          <p className="text-xs font-medium text-earn-text-primary mt-0.5">
            {timing}
          </p>
        )}
        {/* Optional badges/icons row */}
        {badges && badges.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {badges.map((badge, index) => (
              <div
                key={index}
                className="w-6 h-6 rounded overflow-hidden"
              >
                {badge}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chevron */}
      {showChevron && (
        <ChevronRight className="w-5 h-5 text-earn-text-secondary shrink-0" />
      )}
    </button>
  );
}
