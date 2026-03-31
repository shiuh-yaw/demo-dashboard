/**
 * Types for Dynamic auth client components.
 */

export interface DynamicAuthAdapter {
  emailEnabled: boolean;
  socialProviders: string[];
  jwtEnabled: boolean;
  onSendEmailOTP: (email: string) => Promise<unknown>;
  onSocialSignIn: (provider: string) => Promise<void>;
  onHandleOAuthRedirect: () => Promise<boolean>;
  onJwtAuth: (jwt: string) => Promise<void>;
  isSendingOTP?: boolean;
  sendOTPError?: unknown;
  socialAuthError?: unknown;
  isJwtPending?: boolean;
  jwtError?: unknown;
}

export interface ConnectedAuthScreenProps {
  adapter: DynamicAuthAdapter;
  title?: string;
  subtitle?: string;
  onOtpVerify?: (email: string, otpVerification: unknown) => void;
  onLoginSuccess?: () => void;
}
