"use client";

import { useMemo } from "react";
import { 
  ChevronRight, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  CreditCard, 
  Wallet, 
  Building2,
  Sparkles
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@dynamic-demos/ui";
import { Skeleton } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import { usePayoutDemo } from "@/contexts/payout-demo-context";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString("default", { month: "long" });
  const day = date.getDate();
  return `${month} ${day}`;
}

/** Get type display with icon based on activity type and description */
function getTypeDisplay(type: string, description: string): { 
  label: string; 
  icon: React.ReactNode;
  className: string;
} {
  // Check description for specific destinations
  const isPIX = description.toLowerCase().includes("pix");
  const isWallet = description.includes("0x") || description.toLowerCase().includes("wallet");
  const isCard = description.toLowerCase().includes("card") || description.toLowerCase().includes("prepaid");
  
  switch (type) {
    case "Payout":
    case "Mint":
      return {
        label: "Deposit",
        icon: <ArrowDownToLine className="w-3.5 h-3.5" />,
        className: "bg-emerald-100 text-emerald-700",
      };
    case "Yield":
      return {
        label: "Yield",
        icon: <Sparkles className="w-3.5 h-3.5" />,
        className: "bg-emerald-100 text-emerald-700",
      };
    case "Transfer":
      if (isCard) {
        return {
          label: "Card",
          icon: <CreditCard className="w-3.5 h-3.5" />,
          className: "bg-gray-100 text-gray-700",
        };
      }
      return {
        label: "Transfer",
        icon: <ArrowUpFromLine className="w-3.5 h-3.5" />,
        className: "bg-gray-100 text-gray-700",
      };
    case "Withdraw":
      if (isPIX) {
        return {
          label: "PIX",
          icon: <Building2 className="w-3.5 h-3.5" />,
          className: "bg-blue-100 text-blue-700",
        };
      }
      if (isWallet) {
        return {
          label: "Wallet",
          icon: <Wallet className="w-3.5 h-3.5" />,
          className: "bg-purple-100 text-purple-700",
        };
      }
      return {
        label: "Withdraw",
        icon: <ArrowUpFromLine className="w-3.5 h-3.5" />,
        className: "bg-gray-100 text-gray-700",
      };
    default:
      return {
        label: type,
        icon: <ArrowUpFromLine className="w-3.5 h-3.5" />,
        className: "bg-gray-100 text-gray-700",
      };
  }
}

/** Skeleton rows for loading state - extracted to avoid recreation on every render */
const SKELETON_COUNT = 3;
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <TableRow key={`skeleton-${i}`} className="border-earn-border/60">
          <TableCell className="py-2.5">
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell className="py-2.5">
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell className="py-2.5">
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell className="py-2.5 text-right">
            <Skeleton className="h-4 w-16 ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

const MAX_VISIBLE_ACTIVITIES = 5;

export function RecentActivity() {
  const { activities, isHydrated } = usePayoutDemo();

  // Memoize visible activities to avoid recalculating on every render
  const visibleActivities = useMemo(
    () => activities.slice(0, MAX_VISIBLE_ACTIVITIES),
    [activities]
  );

  return (
    <Card>
      <CardContent>
        <CardHeader className="mb-4">
          <CardTitle>Recent activity</CardTitle>
          <a
            href="#"
            className="text-xs text-earn-active-text hover:underline flex items-center gap-1"
          >
            View all <ChevronRight className="w-3 h-3" />
          </a>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="border-earn-border/60 hover:bg-transparent">
              <TableHead className="h-auto py-2 text-xs font-normal text-earn-text-secondary">
                Date
              </TableHead>
              <TableHead className="h-auto py-2 text-xs font-normal text-earn-text-secondary">
                Type
              </TableHead>
              <TableHead className="h-auto py-2 text-xs font-normal text-earn-text-secondary">
                Description
              </TableHead>
              <TableHead className="h-auto py-2 text-xs font-normal text-earn-text-secondary text-right">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isHydrated ? (
              <SkeletonRows />
            ) : visibleActivities.length === 0 ? (
              <TableRow className="border-earn-border/60">
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-earn-text-secondary"
                >
                  No recent activity
                </TableCell>
              </TableRow>
            ) : (
              visibleActivities.map((activity) => {
                const isPositive = activity.amount.startsWith("+");
                const typeDisplay = getTypeDisplay(activity.type, activity.description);
                return (
                  <TableRow
                    key={activity.id}
                    className="border-earn-border/60 hover:bg-gray-50/50"
                  >
                    <TableCell className="py-2.5 text-xs text-earn-text-secondary">
                      {formatDate(activity.date)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${typeDisplay.className}`}>
                        {typeDisplay.icon}
                        {typeDisplay.label}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-earn-text-primary">
                      {activity.description}
                    </TableCell>
                    <TableCell
                      className={`py-2.5 text-sm font-normal text-right ${
                        isPositive
                          ? "text-emerald-600"
                          : "text-earn-text-primary"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(activity.amount.replace("+", ""))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
