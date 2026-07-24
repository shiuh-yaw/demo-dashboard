"use client";

interface EmptyStateProps {
  height: number;
  label?: string;
}

// Rendered instead of the chart body when data is empty or all-zero.
export function EmptyState({ height, label = "No data yet" }: EmptyStateProps) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: "1px dashed var(--chart-1)",
        opacity: 0.4,
        fontSize: 13,
      }}
    >
      {label}
    </div>
  );
}
