import { agreements } from "@/lib/mock-data";

const activeCount = agreements.filter((a) => a.status === "Active").length;
const pendingCount = agreements.filter((a) => a.status === "New").length;

export function AgreementsCard() {
  return (
    <div className="card">
      <div className="card-body flex items-center justify-between">
        <div className="text-sm text-(--widget-muted)">
          <span className="text-(--widget-fg) font-medium">
            {activeCount} active
          </span>{" "}
          · {pendingCount} pending signature · Paid and Free Applications,
          Stablecoin Payout Addendum
        </div>
        <button
          type="button"
          className="text-sm font-medium text-(--widget-primary) bg-transparent border-none cursor-pointer p-0"
        >
          View all →
        </button>
      </div>
    </div>
  );
}
