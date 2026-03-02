"use client";

import { useCallback } from "react";
import { Input } from "@dynamic-demos/ui";
import { Button } from "@dynamic-demos/ui";
import { Label } from "@/components/ui/label";
import { StepProgressIndicator } from "@/components/ui/step-progress-indicator";
import {
  Loader2,
  CheckCircle2,
  Building2,
  ArrowRight,
  User,
  CreditCard,
} from "lucide-react";
import type { BankSetupFlowProps } from "./types";

/**
 * Bank Setup Flow Component
 *
 * Handles the KYC and bank account setup steps:
 * - Setup Info (step 1)
 * - KYC Form (step 2)
 * - Bank Account Form (step 3)
 */
export function BankSetupFlow({
  step,
  onStepChange,
  kycData,
  onKYCDataChange,
  bankData,
  onBankDataChange,
  onComplete,
  isProcessing,
  setIsProcessing,
}: BankSetupFlowProps) {
  const handleStartSetup = useCallback(() => {
    onStepChange("setup_kyc");
  }, [onStepChange]);

  const handleKYCSubmit = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onStepChange("setup_bank");
    }, 1500);
  }, [onStepChange, setIsProcessing]);

  const handleBankSubmit = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onComplete();
    }, 1500);
  }, [onComplete, setIsProcessing]);

  // Setup Step 1: Info
  if (step === "setup_info") {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-earn-text-primary">
            What you&apos;ll need:
          </h4>
          <ul className="text-sm text-earn-text-secondary space-y-2">
            <li className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal information (name, email)
            </li>
            <li className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Tax ID (CPF for Brazil)
            </li>
            <li className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              PIX key for receiving payments
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Demo Mode:</strong> Forms will auto-fill with demo data.
            Just click continue at each step.
          </p>
        </div>

        <StepProgressIndicator totalSteps={4} currentStep={1} />

        <Button onClick={handleStartSetup} className="w-full">
          Start Setup
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // Setup Step 2: KYC Form
  if (step === "setup_kyc") {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={kycData.firstName}
                onChange={(e) =>
                  onKYCDataChange({ ...kycData, firstName: e.target.value })
                }
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={kycData.lastName}
                onChange={(e) =>
                  onKYCDataChange({ ...kycData, lastName: e.target.value })
                }
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={kycData.email}
              onChange={(e) =>
                onKYCDataChange({ ...kycData, email: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={kycData.country}
              onChange={(e) =>
                onKYCDataChange({ ...kycData, country: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="taxId">Tax ID (CPF)</Label>
            <Input
              id="taxId"
              value={kycData.taxId}
              onChange={(e) =>
                onKYCDataChange({ ...kycData, taxId: e.target.value })
              }
              disabled={isProcessing}
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        <StepProgressIndicator totalSteps={4} currentStep={2} />

        <Button
          onClick={handleKYCSubmit}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    );
  }

  // Setup Step 3: Bank Account
  if (step === "setup_bank") {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700">
            Identity verified successfully!
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Bank</Label>
            <Input
              id="bankName"
              value={bankData.bankName}
              onChange={(e) =>
                onBankDataChange({ ...bankData, bankName: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pixKeyType">PIX Key Type</Label>
            <Input
              id="pixKeyType"
              value={bankData.pixKeyType}
              onChange={(e) =>
                onBankDataChange({ ...bankData, pixKeyType: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pixKey">PIX Key</Label>
            <Input
              id="pixKey"
              value={bankData.pixKey}
              onChange={(e) =>
                onBankDataChange({ ...bankData, pixKey: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>
        </div>

        <StepProgressIndicator totalSteps={4} currentStep={3} />

        <Button
          onClick={handleBankSubmit}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Linking Account...
            </>
          ) : (
            <>
              Continue to Withdraw
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}
