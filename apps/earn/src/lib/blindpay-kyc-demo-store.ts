"use client";

/**
 * BlindPay KYC demo state for SE demos.
 * Stored in localStorage, auto-fills dummy data on setup.
 * 
 * In production, this would come from:
 * 1. BlindPay receiver creation (KYC)
 * 2. BlindPay bank account linking
 * 
 * For demo purposes, we auto-generate valid-looking IDs.
 */

const STORAGE_KEY = "earn-demo-blindpay-kyc";

export interface BlindPayKYCState {
  /** Whether KYC setup is complete */
  isComplete: boolean;
  /** BlindPay receiver ID (15 chars: re_xxxxxxxxxxxxx) */
  receiverId: string | null;
  /** BlindPay bank account ID (15 chars: ba_xxxxxxxxxxxxx) */
  bankAccountId: string | null;
  /** KYC status */
  kycStatus: "pending" | "approved" | "rejected" | null;
  /** Bank account display info */
  bankDetails: {
    bankName: string;
    accountType: string;
    pixKey: string;
    holderName: string;
  } | null;
  /** Timestamp when KYC was completed */
  completedAt: number | null;
}

/**
 * Generate a random alphanumeric string of given length
 */
function generateRandomId(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate dummy BlindPay receiver ID (15 chars total: re_ + 12 chars)
 */
function generateReceiverId(): string {
  return `re_${generateRandomId(12)}`;
}

/**
 * Generate dummy BlindPay bank account ID (15 chars total: ba_ + 12 chars)
 */
function generateBankAccountId(): string {
  return `ba_${generateRandomId(12)}`;
}

/**
 * Generate dummy bank details for demo
 */
function generateDummyBankDetails(bankData?: {
  bankName?: string;
  pixKey?: string;
  holderName?: string;
}): BlindPayKYCState["bankDetails"] {
  return {
    bankName: bankData?.bankName || "Nubank",
    accountType: "PIX",
    pixKey: bankData?.pixKey || "+55 11 98765-4321",
    holderName: bankData?.holderName || "Maria Santos",
  };
}

export function getDefaultKYCState(): BlindPayKYCState {
  return {
    isComplete: false,
    receiverId: null,
    bankAccountId: null,
    kycStatus: null,
    bankDetails: null,
    completedAt: null,
  };
}

/** Deterministic state for SSR / first paint to avoid hydration mismatch. */
export function getSSRSafeKYCState(): BlindPayKYCState {
  return getDefaultKYCState();
}

function loadState(): BlindPayKYCState {
  if (typeof window === "undefined") return getDefaultKYCState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultKYCState();
    }
    const parsed = JSON.parse(raw) as BlindPayKYCState;
    // Validate required fields
    if (typeof parsed.isComplete === "boolean") {
      return {
        ...getDefaultKYCState(),
        ...parsed,
      };
    }
  } catch {
    // ignore
  }
  return getDefaultKYCState();
}

function saveState(s: BlindPayKYCState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/**
 * Complete KYC setup with auto-generated dummy data
 * This simulates a user completing BlindPay KYC and linking a bank account
 */
export function completeKYCSetup(bankData?: {
  bankName?: string;
  pixKey?: string;
  holderName?: string;
}): BlindPayKYCState {
  const next: BlindPayKYCState = {
    isComplete: true,
    receiverId: generateReceiverId(),
    bankAccountId: generateBankAccountId(),
    kycStatus: "approved",
    bankDetails: generateDummyBankDetails(bankData),
    completedAt: Date.now(),
  };
  saveState(next);
  return next;
}

/**
 * Reset KYC state (for demo reset)
 */
export function resetKYCState(): BlindPayKYCState {
  const next = getDefaultKYCState();
  saveState(next);
  return next;
}

/**
 * Check if KYC is complete and valid
 */
export function isKYCComplete(state: BlindPayKYCState): boolean {
  return (
    state.isComplete &&
    state.receiverId !== null &&
    state.bankAccountId !== null &&
    state.kycStatus === "approved"
  );
}

/**
 * Get bank account ID for API calls
 */
export function getBankAccountId(state: BlindPayKYCState): string | null {
  if (!isKYCComplete(state)) return null;
  return state.bankAccountId;
}

export { loadState, saveState, STORAGE_KEY };
