"use client";

import { cn } from "@dynamic-demos/utils";

interface AdminCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminCard({ title, description, children, className }: AdminCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-(--brand-radius-lg) border border-(--brand-border) p-6",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-(--brand-muted) mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
