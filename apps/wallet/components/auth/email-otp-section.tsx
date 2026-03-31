"use client";

/**
 * Email OTP Authentication Section
 *
 * Renders the email input and "Continue" button.
 * Only visible when email authentication is enabled in the dashboard.
 *
 * @see https://www.dynamic.xyz/docs/javascript/authentication-methods/email
 */

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { useSendEmailOTP } from "@/hooks/use-mutations";
import { isEmailAuthEnabled } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface EmailOtpSectionProps {
  navigation: NavigationReturn;
}

/**
 * Email OTP form section — returns null if email auth is not enabled
 */
export function EmailOtpSection({ navigation }: EmailOtpSectionProps) {
  const [email, setEmail] = useState("");
  const sendOTP = useSendEmailOTP();

  if (!isEmailAuthEnabled()) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const otpVerification = await sendOTP.mutateAsync(email);
      navigation.goToOtpVerify(email, otpVerification);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="login-email"
          className="block text-xs font-medium text-[var(--widget-fg,#252731)]"
        >
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--widget-muted,#9a9a9a)] pointer-events-none" />
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={sendOTP.isPending}
            className={cn(
              "flex h-10 w-full rounded-lg border bg-white pl-10 pr-3 py-2 text-sm text-[var(--widget-fg,#252731)]",
              "border-[var(--widget-border,#e1e4ea)]",
              "outline-none placeholder:text-[var(--widget-muted,#9a9a9a)]",
              "focus:border-[var(--widget-primary,#335cff)] focus:ring-1 focus:ring-[var(--widget-primary,#335cff)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-10"
        loading={sendOTP.isPending}
        disabled={!email.trim()}
      >
        Continue →
      </Button>
      <ErrorMessage error={sendOTP.error} />
    </form>
  );
}
