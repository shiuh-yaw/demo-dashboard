interface StatusBadgeProps {
  status: "overdue" | "due" | "paid";
  overdueDays?: number;
}

export function StatusBadge({ status, overdueDays }: StatusBadgeProps) {
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        Overdue {overdueDays ? `${overdueDays}d` : ""}
      </span>
    );
  }

  if (status === "paid") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        Paid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      Pending
    </span>
  );
}
