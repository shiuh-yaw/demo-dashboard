import { Filter, Search, ChevronDown } from "lucide-react";
import { type TransactionStatus } from "@/lib/types/dashboard";
import { STATUS_OPTIONS } from "./constants";

interface TransactionsFiltersProps {
  statusFilter: TransactionStatus | "all";
  searchQuery: string;
  total: number;
  onStatusChange: (status: TransactionStatus | "all") => void;
  onSearchChange: (query: string) => void;
}

export function TransactionsFilters({
  statusFilter,
  searchQuery,
  total,
  onStatusChange,
  onSearchChange,
}: TransactionsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                onStatusChange(e.target.value as TransactionStatus | "all");
              }}
              className="text-sm border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[120px]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by external ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
      </div>
      <p className="text-sm text-slate-500 shrink-0">
        {total} transaction{total !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
