"use client";

import { useEarnConfig } from "@/contexts/earn-config-context";

/**
 * Earn page header with configurable title and description.
 * Uses the EarnConfig context for title and description values.
 */
export function EarnPageHeader() {
  const { title, description } = useEarnConfig();

  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-xl sm:text-2xl font-normal text-earn-text-primary mb-1">
        {title}
      </h1>
      <p className="text-sm text-earn-text-secondary">{description}</p>
    </div>
  );
}
