"use client";

import { useMutation } from "@tanstack/react-query";
import {
  sendEmailOTP,
  verifyOTP,
  getAuthToken,
  type OTPVerification,
} from "@/lib/dynamic";
import { syncCookie } from "@/lib/auth/sync-cookie";

export function useSendEmailOTP() {
  return useMutation({
    mutationFn: (email: string) => sendEmailOTP({ email }),
  });
}

export function useVerifyOTP() {
  return useMutation({
    mutationFn: async ({
      otpVerification,
      otp,
    }: {
      otpVerification: OTPVerification;
      otp: string;
    }) => {
      const result = await verifyOTP({
        otpVerification,
        verificationToken: otp,
      });

      const token = await getAuthToken();
      if (token) await syncCookie(token);

      return result;
    },
  });
}
