import type { BlindPayKYCState } from "@/lib/blindpay-kyc-demo-store";

/**
 * All steps in the unified withdraw to bank flow
 */
export type WithdrawToBankStep =
  | "setup_info" // Setup intro (if KYC not complete)
  | "setup_kyc" // KYC form
  | "setup_bank" // Bank account form
  | "amount" // Enter withdrawal amount
  | "confirm" // Confirm quote
  | "processing" // Processing withdrawal
  | "success"; // Success

/**
 * KYC form data
 */
export interface KYCFormData {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  taxId: string;
}

/**
 * Bank account form data
 */
export interface BankFormData {
  bankName: string;
  pixKey: string;
  pixKeyType: string;
}

/**
 * Quote result from BlindPay
 */
export interface WithdrawalQuote {
  quoteId: string;
  requestAmount: number;
  fees: number;
  receiveAmount: number;
  exchangeRate: number;
  expiresAt?: string;
}

/**
 * Withdrawal result
 */
export interface WithdrawalResult {
  payoutId: string;
  status: string;
  amount?: number;
}

/**
 * Props for setup flow component
 */
export interface BankSetupFlowProps {
  step: WithdrawToBankStep;
  onStepChange: (step: WithdrawToBankStep) => void;
  kycData: KYCFormData;
  onKYCDataChange: (data: KYCFormData) => void;
  bankData: BankFormData;
  onBankDataChange: (data: BankFormData) => void;
  onComplete: () => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

/**
 * Props for withdrawal flow component
 */
export interface BankWithdrawalFlowProps {
  step: WithdrawToBankStep;
  onStepChange: (step: WithdrawToBankStep) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  availableAmount: number;
  quote: WithdrawalQuote | null;
  result: WithdrawalResult | null;
  bankDetails: BlindPayKYCState["bankDetails"];
  isKYCComplete: boolean;
  isHydrated: boolean;
  isQuoting: boolean;
  isPending: boolean;
  onGetQuote: () => void;
  onConfirm: () => void;
  onClose: () => void;
  displayToken: string;
}

/**
 * Demo data constants
 */
export const DEMO_KYC_DATA: KYCFormData = {
  firstName: "Maria",
  lastName: "Santos",
  email: "maria.santos@gmail.com",
  country: "Brazil",
  taxId: "847.592.310-68", // CPF format
};

export const DEMO_BANK_DATA: BankFormData = {
  bankName: "Nubank",
  pixKey: "+55 11 98765-4321",
  pixKeyType: "Phone",
};
