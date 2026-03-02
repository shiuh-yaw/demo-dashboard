"use client";

/**
 * Recent activity demo state for SE demos.
 * Stored in localStorage. On reset, generates dummy activities.
 * When user does "Get paid" or "Add funds", we add real-time entries.
 */

const STORAGE_KEY = "earn-demo-activity";

export interface ActivityItem {
  id: string;
  date: string; // ISO date string
  type: "Transfer" | "Yield" | "Payout" | "Mint" | "Withdraw";
  description: string;
  amount: string; // e.g. "-250.00" or "+5.63"
  status: "completed" | "pending";
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDateISO(d);
}

/**
 * Generate initial activity based on prepaid card balance.
 * Shows a single transfer entry matching the card's starting balance.
 */
export function generateDefaultActivities(
  prepaidBalance: number
): ActivityItem[] {
  return [
    {
      id: generateId(),
      date: daysAgo(1),
      type: "Transfer",
      description: "Balance → Prepaid Card",
      amount: `-${prepaidBalance.toFixed(2)}`,
      status: "completed",
    },
  ];
}

export function getSSRSafeActivities(): ActivityItem[] {
  return [];
}

export function loadActivities(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Will be initialized on first reset or when context loads with payout values
      return [];
    }
    const parsed = JSON.parse(raw) as ActivityItem[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveActivities(activities: ActivityItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  } catch {
    // ignore
  }
}

/** Add a new activity to the front of the list. */
export function addActivity(
  activities: ActivityItem[],
  newActivity: Omit<ActivityItem, "id" | "date" | "status">
): ActivityItem[] {
  const activity: ActivityItem = {
    ...newActivity,
    id: generateId(),
    date: formatDateISO(new Date()),
    status: "completed",
  };
  const next = [activity, ...activities].slice(0, 20); // Keep max 20 items
  saveActivities(next);
  return next;
}

/** Create activity for "Get paid" (mint) action. */
export function createGetPaidActivity(
  amount: number
): Omit<ActivityItem, "id" | "date" | "status"> {
  return {
    type: "Payout",
    description: "Requested payout",
    amount: `+${amount.toFixed(2)}`,
  };
}

/** Create activity for "Add funds" (transfer to prepaid card) action. */
export function createAddFundsActivity(
  amount: number
): Omit<ActivityItem, "id" | "date" | "status"> {
  return {
    type: "Transfer",
    description: "Balance → Prepaid Card",
    amount: `-${amount.toFixed(2)}`,
  };
}

/** Create activity for "Withdraw to wallet" action. */
export function createWithdrawActivity(
  amount: number,
  walletAddress: string
): Omit<ActivityItem, "id" | "date" | "status"> {
  // Truncate address for display
  const truncated = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  return {
    type: "Withdraw",
    description: `Balance → Wallet (${truncated})`,
    amount: `-${amount.toFixed(2)}`,
  };
}

/** Create activity for "Withdraw to bank via PIX" action. */
export function createPIXWithdrawActivity(
  amount: number,
  pixKey?: string
): Omit<ActivityItem, "id" | "date" | "status"> {
  // Truncate PIX key for display if provided
  const keyDisplay = pixKey 
    ? ` (${pixKey.length > 12 ? `${pixKey.slice(0, 6)}...${pixKey.slice(-4)}` : pixKey})`
    : "";
  return {
    type: "Withdraw",
    description: `Balance → PIX${keyDisplay}`,
    amount: `-${amount.toFixed(2)}`,
  };
}

/** Reset activities with new dummy data based on prepaid card balance. */
export function resetActivities(prepaidBalance: number): ActivityItem[] {
  const next = generateDefaultActivities(prepaidBalance);
  saveActivities(next);
  return next;
}

export { STORAGE_KEY as ACTIVITY_STORAGE_KEY };
