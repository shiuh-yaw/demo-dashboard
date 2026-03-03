"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { Input } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { useSendEmailOTP } from "@/hooks/use-mutations";
import { isEmailAuthEnabled } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface EmailOtpSectionProps {
  navigation: NavigationReturn;
}

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={sendOTP.isPending}
      />
      <Button
        type="submit"
        className="w-full"
        loading={sendOTP.isPending}
        disabled={!email.trim()}
      >
        <Mail className="w-4 h-4" />
        Continue with Email
      </Button>
      <ErrorMessage error={sendOTP.error} />
    </form>
  );
}
