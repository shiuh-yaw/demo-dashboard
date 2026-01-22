import { Status, type TransactionStatus } from "@/lib/types/dashboard";

export const PAGE_SIZE = 10;

export const STATUS_OPTIONS: {
  value: TransactionStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: Status.CONFIRMED, label: "Confirmed" },
  { value: Status.PENDING, label: "Pending" },
  { value: Status.SUBMITTED, label: "Submitted" },
  { value: Status.FAILED, label: "Failed" },
  { value: Status.CANCELLED, label: "Cancelled" },
  { value: Status.DRAFT, label: "Draft" },
  { value: Status.INITIALIZED, label: "Initialized" },
  { value: Status.EXPIRED, label: "Expired" },
  { value: Status.ABANDONED, label: "Abandoned" },
];
