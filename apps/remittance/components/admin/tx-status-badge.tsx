"use client";

import { cn } from "@dynamic-demos/utils";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800",
  CONFIRMING: "bg-blue-100 text-blue-800",
  BROADCASTING: "bg-blue-100 text-blue-800",
  PENDING_SIGNATURE: "bg-yellow-100 text-yellow-800",
  PENDING_AUTHORIZATION: "bg-yellow-100 text-yellow-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  QUEUED: "bg-gray-100 text-gray-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  BLOCKED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
};

interface TxStatusBadgeProps {
  status: string;
  className?: string;
}

export function TxStatusBadge({ status, className }: TxStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        style,
        className,
      )}
    >
      {status}
    </span>
  );
}
