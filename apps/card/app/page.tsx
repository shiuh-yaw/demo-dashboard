"use client";

/**
 * Card login screen. Rendered behind <DynamicGate>, so the client is fully
 * initialized here: projectSettings are populated and safe to read. Auth runs
 * through the official react-hooks; signed-in state comes from useUser.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  detectSocialRedirectUrl,
  type OTPVerification,
  type SocialProvider,
} from "@dynamic-labs-sdk/client";
import {
  useUser,
  useDynamicClient,
  useSendEmailOTP,
  useVerifyOTP,
  useSignInWithSocialRedirect,
  useCompleteSocialRedirect,
} from "@dynamic-labs-sdk/react-hooks";
import { LoginForm, WidgetCard } from "@dynamic-demos/ui";

export default function Home() {
  const router = useRouter();
  const client = useDynamicClient();
  const { data: user } = useUser();

  const { mutateAsync: sendEmailOTP, isPending: isSendingOtp, error: sendOtpError } =
    useSendEmailOTP();
  const { mutateAsync: verifyOtpMutate, isPending: isVerifying, error: verifyError } =
    useVerifyOTP();
  const { mutateAsync: signInWithSocial, error: socialAuthError } =
    useSignInWithSocialRedirect();
  const { mutateAsync: completeSocial } = useCompleteSocialRedirect();

  const [step, setStep] = useState<"login" | "verify">("login");
  const [email, setEmail] = useState("");
  const [otpVerification, setOtpVerification] = useState<OTPVerification | null>(null);
  const [otp, setOtp] = useState("");

  // Enabled auth methods read straight off the initialized client.
  const emailEnabled =
    client?.projectSettings?.providers?.some(
      (p) => p.provider === "dynamic" && p.enabledAt != null,
    ) ?? false;
  const socialProviders =
    client?.projectSettings?.sdk?.socialSignIn?.providers
      ?.filter((p) => p.enabled)
      .map((p) => p.provider) ?? [];

  useEffect(() => {
    if (user) router.replace("/apply");
  }, [user, router]);

  const handleSendEmailOTP = useCallback(
    async (nextEmail: string) => {
      // Resolves the OTPVerification directly (matches the wrapped SDK
      // `sendEmailOTP`'s return shape) - not `{ otpVerification }`.
      const result = await sendEmailOTP({ email: nextEmail });
      setEmail(nextEmail);
      setOtpVerification(result);
      setStep("verify");
    },
    [sendEmailOTP],
  );

  const handleVerifyOtp = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!otpVerification || !otp.trim()) return;
      await verifyOtpMutate({ otpVerification, verificationToken: otp.trim() });
      // useUser flips reactively; the redirect effect handles navigation.
    },
    [otpVerification, otp, verifyOtpMutate],
  );

  const handleSocialSignIn = useCallback(
    async (provider: string) => {
      await signInWithSocial({
        provider: provider as SocialProvider,
        redirectUrl: window.location.href,
      });
    },
    [signInWithSocial],
  );

  // Detection stays the plain SDK call: `useDetectSocialRedirectUrl` is a
  // query hook (auto-running, read via `data`), which can't satisfy
  // <LoginForm>'s `onHandleOAuthRedirect: () => Promise<boolean>` one-shot
  // imperative contract. Completion uses the `useCompleteSocialRedirect`
  // mutation hook - it fits and keeps us on the official hooks.
  const handleOAuthRedirect = useCallback(async () => {
    const url = new URL(window.location.href);
    const detected = await detectSocialRedirectUrl({ url }, client);
    if (!detected) return false;
    await completeSocial({ url });
    return true;
  }, [client, completeSocial]);

  return (
    <WidgetCard>
      <div className="p-4">
        {step === "login" && (
            <LoginForm
              emailEnabled={emailEnabled}
              onSendEmailOTP={handleSendEmailOTP}
              isSendingOTP={isSendingOtp}
              sendOTPError={sendOtpError}
              socialProviders={socialProviders}
              onSocialSignIn={handleSocialSignIn}
              socialAuthError={socialAuthError}
              onHandleOAuthRedirect={handleOAuthRedirect}
            />
          )}
          {step === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-(--brand-muted)">
                Enter the code sent to {email}
              </p>
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoFocus
                disabled={isVerifying}
                className="w-full rounded-lg border border-(--brand-border) bg-(--brand-surface) px-3 py-2 text-sm text-(--brand-fg) outline-none focus:border-(--brand-primary) focus:ring-1 focus:ring-(--brand-primary) disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!otp.trim() || isVerifying}
                className="w-full rounded-lg bg-(--brand-primary) px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </button>
              {verifyError ? (
                <p className="text-xs text-red-600">
                  {verifyError instanceof Error
                    ? verifyError.message
                    : "Something went wrong. Please try again."}
                </p>
              ) : null}
              <p className="text-center text-xs text-(--brand-muted)">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="text-(--brand-accent) hover:underline"
                >
                  Try again
                </button>
              </p>
            </form>
          )}
      </div>
    </WidgetCard>
  );
}
