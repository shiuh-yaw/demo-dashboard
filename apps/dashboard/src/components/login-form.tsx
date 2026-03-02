"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getJWTToken,
  sendEmailOTP,
  type OTPVerification,
} from "@/lib/dynamicClient";
import { DynamicLogo } from "@/components/dynamic-logo";
import { setDynamicJWT } from "@/lib/auth/session";
import { SendOTPFormSection } from "./auth/SendOTPFormSection";
import { OTPConfirmationView } from "./auth/OTPConfirmationView";
import { GoogleLoginButton } from "./auth/GoogleLoginButton";
import { useCompleteSocialAuth } from "@/hooks/use-complete-social-auth";

/**
 * Dashboard Login Form
 *
 * Google OAuth + Email OTP authentication using Dynamic SDK.
 * Supports both social login and email verification.
 *
 */
export default function DashboardLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpVerification, setOtpVerification] =
    useState<OTPVerification | null>(null);

  // Handle OAuth redirects (Google sign-in completion)
  const { isLoading: isOAuthLoading, error: oAuthError } =
    useCompleteSocialAuth({
      onSuccess: () => {
        router.refresh();
      },
    });

  /**
   * Handles successful OTP verification from SendOTPFormSection
   * @param verification - The OTP verification object returned from sendEmailOTP
   * @param email - The email address used for authentication
   */
  function handleOtpVerification(verification: OTPVerification, email: string) {
    setEmail(email);
    setOtpVerification(verification);
  }

  /**
   * Handles OTP resend - creates a new verification object
   */
  async function handleResendOtp() {
    try {
      const newVerification = await sendEmailOTP({ email });
      setOtpVerification(newVerification);
      return newVerification;
    } catch (error) {
      console.error("Failed to resend OTP:", error);
      throw error;
    }
  }

  /**
   * Handles cancellation of OTP verification, returning to email input
   */
  function handleCancel() {
    setOtpVerification(null);
    setEmail("");
  }

  /**
   * Handles successful OTP verification
   * Retrieves JWT token and sets it in a cookie for server-side authentication
   */
  async function handleOtpSuccess() {
    try {
      const jwt = getJWTToken();
      if (!jwt) {
        throw new Error("Authentication succeeded but no token available");
      }

      const result = await setDynamicJWT(jwt);
      if (!result.success) {
        console.error("Failed to set auth cookie:", result.error);
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to complete authentication:", err);
      router.refresh();
    }
  }

  // Show loading state during OAuth completion
  if (isOAuthLoading) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="flex flex-col items-center mb-8">
          <DynamicLogo width={200} height={45} className="mb-2" />
        </div>
        <div className="bg-white rounded-lg border border-[#e1e4ea] shadow-[0px_8px_8px_-4px_rgba(10,13,18,0.03),0px_3px_3px_-1.5px_rgba(10,13,18,0.04)] p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-[#5166EE] rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Completing sign in...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <DynamicLogo width={200} height={45} className="mb-2" />
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-lg border border-[#e1e4ea] shadow-[0px_8px_8px_-4px_rgba(10,13,18,0.03),0px_3px_3px_-1.5px_rgba(10,13,18,0.04)] p-4">
        {otpVerification ? (
          <OTPConfirmationView
            email={email}
            otpVerification={otpVerification}
            onCancel={handleCancel}
            onSuccess={handleOtpSuccess}
            onResend={handleResendOtp}
          />
        ) : (
          <div className="space-y-4">
            {/* OAuth Error */}
            {oAuthError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {oAuthError.message}
              </div>
            )}

            {/* Google Sign In */}
            <GoogleLoginButton />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email OTP */}
            <SendOTPFormSection onOtpVerification={handleOtpVerification} />
          </div>
        )}
      </div>
    </div>
  );
}
