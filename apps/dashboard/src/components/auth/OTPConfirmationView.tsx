"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  verifyOTP,
  sendEmailOTP,
  type OTPVerification,
} from "@/lib/dynamicClient";
import { cn } from "@dynamic-demos/utils";
import { Input } from "@dynamic-demos/ui";
import { Button } from "@dynamic-demos/ui";

type OTPConfirmationViewProps = {
  email: string;
  otpVerification: OTPVerification;
  onCancel: () => void;
  onSuccess: () => void;
  onResend?: (newVerification: OTPVerification) => void;
};

/**
 * OTP Confirmation View
 *
 * Handles OTP verification after email has been sent.
 */
export function OTPConfirmationView({
  email,
  otpVerification,
  onCancel,
  onSuccess,
  onResend,
}: OTPConfirmationViewProps) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const otpString = otp.join("");

  function handleInputChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(0, 1);

    if (digit) {
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      setError(null);

      if (index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }
    } else {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 6).split("");
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (index + i < 6) {
            newOtp[index + i] = digit;
          }
        });
        setOtp(newOtp);
        setError(null);
        const nextIndex = Math.min(index + digits.length, 5);
        inputRefs.current[nextIndex]?.focus();
      });
    }
  }

  function handlePaste(
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number
  ) {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const digits = pastedText.replace(/\D/g, "").slice(0, 6).split("");

    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      if (index + i < 6) {
        newOtp[index + i] = digit;
      }
    });
    setOtp(newOtp);
    setError(null);
    const nextIndex = Math.min(index + digits.length, 5);
    inputRefs.current[nextIndex]?.focus();
  }

  async function handleResend() {
    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      const newVerification = await sendEmailOTP({ email });
      setResendSuccess(true);
      if (onResend) {
        onResend(newVerification);
      }
      setTimeout(() => setResendSuccess(false), 3000);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);

    try {
      await verifyOTP({
        otpVerification,
        verificationToken: otpString,
      });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid OTP. Please try again."
      );
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* OTP Field */}
      <div>
        <label
          htmlFor="otp-input-0"
          className="block text-base font-semibold text-slate-900 mb-2 text-center"
        >
          Verification Code
        </label>
        <p className="text-xs text-slate-500 mb-4 text-center max-w-[280px] mx-auto">
          We've sent a verification code to {email}
        </p>
        <div className="flex gap-2 justify-center">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              id={index === 0 ? "otp-input-0" : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(e, index)}
              disabled={isLoading}
              maxLength={1}
              className={cn(
                "w-11 h-12 p-0 text-center text-lg font-semibold",
                "bg-slate-50 border border-slate-200 rounded-lg",
                "text-slate-900",
                "focus:outline-none focus:ring-2 focus:ring-[#4779FF]/20 focus:border-[#4779FF] focus:bg-white",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all",
                error && "border-red-300"
              )}
              aria-label={`Digit ${index + 1} of verification code`}
            />
          ))}
        </div>
        {/* Re-send Code Link */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || isLoading}
            className={cn(
              "text-xs text-[#4779FF] hover:text-[#3968e8]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors underline cursor-pointer"
            )}
          >
            {isResending
              ? "Sending..."
              : resendSuccess
              ? "Code sent!"
              : "Re-send code"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          variant="outline"
          size="icon"
          className="w-11 h-11"
          title="Back to email"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Button>
        <Button
          type="submit"
          disabled={isLoading || otpString.length !== 6}
          className={cn(
            "flex-1 h-11 gap-2",
            "bg-[#4779FF] hover:bg-[#3968e8] text-white text-sm font-medium",
            "rounded-lg",
            "focus:ring-2 focus:ring-[#4779FF]/50 focus:ring-offset-2"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </Button>
      </div>
    </form>
  );
}
