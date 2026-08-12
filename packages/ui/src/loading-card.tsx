"use client";

import type { ReactNode } from "react";
import { WidgetCard } from "./widget-card";
import { Spinner } from "./spinner";

export interface LoadingCardProps {
  /** Icon to display in card header */
  icon: ReactNode;
  /** Card title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Loading message to display */
  message?: string;
  /** Called when close button is clicked */
  onClose?: () => void;
  /** Called when the header back arrow is clicked (replaces the icon) */
  onBack?: () => void;
}

/**
 * Reusable loading state card for widget UIs
 */
export function LoadingCard({
  icon,
  title,
  subtitle,
  message,
  onClose,
  onBack,
}: LoadingCardProps) {
  return (
    <WidgetCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      onBack={onBack}
    >
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Spinner size="lg" />
        {message && <p className="text-sm text-(--widget-muted)">{message}</p>}
      </div>
    </WidgetCard>
  );
}
