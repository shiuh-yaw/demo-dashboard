"use client";

import { useState } from "react";
import { Mail, Loader2, ArrowRight } from "lucide-react";
import { sendEmailOTP, type OTPVerification } from "@/lib/dynamicClient";
import { cn } from "@dynamic-demos/utils";
import { Input } from "@dynamic-demos/ui";
import { Button } from "@dynamic-demos/ui";

type SendOTPFormSectionProps = {
  onOtpVerification: (otpVerification: OTPVerification, email: string) => void;
};

/**
 * Send OTP Form Section
 *
 * Handles email input and sending OTP for authentication.
 */
export function SendOTPFormSection({
  onOtpVerification,
}: SendOTPFormSectionProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const verification = await sendEmailOTP({ email });
      onOtpVerification(verification, email);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Field */}
      <div>
        <label
          htmlFor="email-input"
          className="block text-xs font-medium text-slate-700 mb-2"
        >
          Email address
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            aria-hidden="true"
          />
          <Input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            disabled={isLoading}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "email-error" : undefined}
            className={cn(
              "h-11 pl-10 pr-4 text-sm",
              "bg-slate-50 border-slate-200 rounded-lg",
              "text-slate-900 placeholder:text-slate-400",
              "focus:ring-2 focus:ring-[#4779FF]/20 focus:border-[#4779FF] focus:bg-white",
              "transition-all",
              error &&
                "border-red-300 focus:ring-red-500/20 focus:border-red-500"
            )}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          id="email-error"
          role="alert"
          className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || !email}
        className={cn(
          "w-full h-11 gap-2",
          "bg-[#4779FF] hover:bg-[#3968e8] text-white text-sm font-medium",
          "rounded-lg",
          "focus:ring-2 focus:ring-[#4779FF]/50 focus:ring-offset-2"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending code...
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  );
}
