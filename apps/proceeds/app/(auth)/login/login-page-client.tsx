"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { useSendEmailOTP, useVerifyOTP } from "@/hooks/use-mutations";
import { Spinner } from "@dynamic-demos/ui";
import type { OTPVerification } from "@/lib/dynamic";

type Step = "email" | "sending" | "otp" | "verifying";

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/payment-methods";
  const isClientReady = useClientInitialized();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [otpVerification, setOtpVerification] =
    useState<OTPVerification | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const sendOTP = useSendEmailOTP();
  const verifyOTP = useVerifyOTP();

  const goToApp = useCallback(() => {
    const dest = returnTo || "/payment-methods";
    window.location.href = dest.startsWith("/") ? dest : `/${dest}`;
  }, [returnTo]);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [step]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setStep("sending");
    try {
      const verification = await sendOTP.mutateAsync(email.trim());
      setOtpVerification(verification);
      setStep("otp");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to send verification code.",
      );
      setStep("email");
    }
  }

  async function handleVerifyOtp() {
    if (otp.length < 4 || !otpVerification) return;
    setStep("verifying");
    setError("");
    try {
      await verifyOTP.mutateAsync({ otpVerification, otp });
      goToApp();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Incorrect code. Please try again.",
      );
      setStep("otp");
    }
  }

  async function handleResend() {
    if (!email.trim()) return;
    setResent(false);
    setError("");
    try {
      const verification = await sendOTP.mutateAsync(email.trim());
      setOtpVerification(verification);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not resend code.",
      );
    }
  }

  if (!isClientReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] px-6">
      <div
        className="w-full max-w-[380px] bg-white rounded-[20px] p-[36px_28px_28px]"
        style={{
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        {/* Email entry */}
        {(step === "email" || step === "sending") && (
          <form onSubmit={handleSendOtp}>
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-[#1D1D1F] mb-4">
                <span className="text-[22px] font-bold text-white tracking-tight">
                  P
                </span>
              </div>
              <div className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">
                Sign in to Proceeds
              </div>
              <div className="text-sm text-[#86868B] mt-1">
                Developer Payout Portal
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                autoComplete="email"
                required
                disabled={step === "sending"}
                className="w-full h-11 rounded-lg border px-3 text-sm text-[#1D1D1F] bg-white outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#86868B]"
                style={{
                  borderColor: error ? "#FF3B30" : "#D2D2D7",
                }}
                onFocus={(e) => {
                  if (!error)
                    e.currentTarget.style.borderColor = "#0071E3";
                }}
                onBlur={(e) => {
                  if (!error)
                    e.currentTarget.style.borderColor = "#D2D2D7";
                }}
              />
            </div>

            {error && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 text-[13px] text-[#C62828] bg-[#FFF2F2] border border-[#FFCDD2]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={step === "sending" || !email.trim()}
              className="w-full h-10 rounded-lg text-[17px] text-white border-none cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:cursor-default"
              style={{
                background:
                  step === "sending" || !email.trim()
                    ? "rgba(0,113,227,0.4)"
                    : "#0071E3",
              }}
            >
              {step === "sending" ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full animate-spin shrink-0"
                    style={{
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#FFFFFF",
                    }}
                  />
                  Sending…
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        )}

        {/* OTP verification */}
        {(step === "otp" || step === "verifying") && (
          <div>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[rgba(0,113,227,0.08)] flex items-center justify-center">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0071E3"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>
            <div className="text-xl font-semibold text-[#1D1D1F] text-center mb-1 tracking-tight">
              Check your email
            </div>
            <div className="text-sm text-[#86868B] text-center mb-6 leading-relaxed">
              We sent a verification code to
              <br />
              <strong className="text-[#1D1D1F] font-medium">{email}</strong>
            </div>

            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerifyOtp();
              }}
              placeholder="------"
              disabled={step === "verifying"}
              className="w-full rounded-xl py-3.5 px-5 text-2xl font-semibold text-center text-[#1D1D1F] bg-white outline-none mb-4 transition-colors tracking-[0.25em]"
              style={{
                border: `1px solid ${error ? "#FF3B30" : "#D2D2D7"}`,
              }}
              onFocus={(e) => {
                if (!error) {
                  e.currentTarget.style.border = "3px solid #0071E3";
                  e.currentTarget.style.padding = "12px 18px";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.currentTarget.style.border = "1px solid #D2D2D7";
                  e.currentTarget.style.padding = "14px 20px";
                }
              }}
            />

            {error && (
              <div className="mb-3 rounded-xl px-3.5 py-2.5 text-[13px] text-[#C62828] text-center bg-[#FFF2F2] border border-[#FFCDD2]">
                {error}
              </div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={otp.length < 4 || step === "verifying"}
              className="w-full h-10 rounded-lg text-[17px] text-white border-none cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:cursor-default"
              style={{
                background:
                  otp.length >= 4 && step !== "verifying"
                    ? "#0071E3"
                    : "rgba(0,113,227,0.4)",
              }}
            >
              {step === "verifying" ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full animate-spin shrink-0"
                    style={{
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#FFFFFF",
                    }}
                  />
                  Verifying…
                </>
              ) : (
                "Verify"
              )}
            </button>

            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={handleResend}
                disabled={step === "verifying"}
                className="text-[13px] font-medium bg-transparent border-none p-0 disabled:cursor-default cursor-pointer"
                style={{ color: resent ? "#30D158" : "#0071E3" }}
              >
                {resent ? "✓ Code resent" : "Resend code"}
              </button>
              <span className="text-[10px] text-[#D2D2D7]">•</span>
              <button
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError("");
                  setOtpVerification(null);
                }}
                disabled={step === "verifying"}
                className="text-[13px] font-medium text-[#86868B] bg-transparent border-none p-0 disabled:cursor-default cursor-pointer"
              >
                Use different email
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-[#86868B] text-center">
        Proceeds Developer Portal · Sandbox
      </div>
    </div>
  );
}
