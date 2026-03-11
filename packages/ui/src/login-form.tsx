"use client";

/**
 * LoginForm — Reusable login component for all demo apps
 *
 * Supports email OTP, social OAuth, and external JWT authentication.
 * Each method renders conditionally based on the provided config/handlers.
 * The parent app wires up SDK calls and passes them as props.
 */

import { useState, useEffect, useRef } from "react";
import { SocialIcon } from "@dynamic-labs/iconic";
import { cn } from "@dynamic-demos/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Spinner } from "./spinner";
import { WidgetCard } from "./widget-card";
import { ErrorBanner } from "./error-banner";

// =============================================================================
// TYPES
// =============================================================================

export interface LoginFormProps {
  // ── Email OTP ────────────────────────────────────────────────
  /** Whether email OTP auth is enabled */
  emailEnabled?: boolean;
  /** Send OTP to email. Should return an opaque token/object for verification. */
  onSendEmailOTP?: (email: string) => Promise<void>;
  /** Whether the OTP send is in progress */
  isSendingOTP?: boolean;
  /** Error from the OTP send operation */
  sendOTPError?: unknown;

  // ── Social OAuth ─────────────────────────────────────────────
  /** List of enabled social provider names (e.g., ["google", "github"]) */
  socialProviders?: string[];
  /** Initiate social auth flow for a provider */
  onSocialSignIn?: (provider: string) => Promise<void>;
  /** Error from social auth */
  socialAuthError?: unknown;
  /**
   * Detect and complete an OAuth redirect on mount.
   * The parent app should implement the full redirect flow.
   * Returns true if an OAuth redirect was detected and is being completed.
   */
  onHandleOAuthRedirect?: () => Promise<boolean>;

  // ── External JWT ─────────────────────────────────────────────
  /** Whether external JWT auth is enabled */
  jwtEnabled?: boolean;
  /** Authenticate with a JWT token */
  onJwtAuth?: (jwt: string) => Promise<void>;
  /** Whether JWT auth is in progress */
  isJwtPending?: boolean;
  /** Error from JWT auth */
  jwtError?: unknown;

  // ── General ──────────────────────────────────────────────────
  /** Additional CSS classes for the root element */
  className?: string;
}

// =============================================================================
// ICONS (inline SVGs to avoid external deps for the shared package)
// =============================================================================

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

// SocialIcon is imported from @dynamic-labs/iconic (supports all providers)

// =============================================================================
// ERROR DISPLAY (inline, uses ErrorBanner from package)
// =============================================================================

function InlineError({ error }: { error: unknown }) {
  if (!error) return null;

  let message = "Something went wrong. Please try again.";
  if (typeof error === "object" && error !== null && "message" in error) {
    message = (error as { message: string }).message;
  } else if (typeof error === "string") {
    message = error;
  }

  return <ErrorBanner message={message} type="error" />;
}

// =============================================================================
// SECTION: Email OTP
// =============================================================================

function EmailOtpSection({
  onSendEmailOTP,
  isSendingOTP,
  sendOTPError,
}: {
  onSendEmailOTP: (email: string) => Promise<void>;
  isSendingOTP?: boolean;
  sendOTPError?: unknown;
}) {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await onSendEmailOTP(email);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={isSendingOTP}
      />
      <Button
        type="submit"
        className="w-full"
        loading={isSendingOTP}
        disabled={!email.trim()}
      >
        <MailIcon className="w-4 h-4" />
        Continue with Email
      </Button>
      <InlineError error={sendOTPError} />
    </form>
  );
}

// =============================================================================
// SECTION: Social Providers
// =============================================================================

function SocialProvidersSection({
  providers,
  onSocialSignIn,
  socialAuthError,
  showDivider,
}: {
  providers: string[];
  onSocialSignIn: (provider: string) => Promise<void>;
  socialAuthError?: unknown;
  showDivider?: boolean;
}) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    try {
      setLoadingProvider(provider);
      await onSocialSignIn(provider);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <>
      {showDivider && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-(--widget-border)" />
          <span className="text-xs text-(--widget-muted)">or</span>
          <div className="flex-1 h-px bg-(--widget-border)" />
        </div>
      )}

      {providers.map((provider) => (
        <Button
          key={provider}
          variant="secondary"
          className="w-full"
          onClick={() => handleSignIn(provider)}
          disabled={loadingProvider !== null}
          loading={loadingProvider === provider}
        >
          <SocialIcon name={provider} className="w-4 h-4" />
          Continue with {capitalize(provider)}
        </Button>
      ))}

      <InlineError error={socialAuthError} />
    </>
  );
}

// =============================================================================
// SECTION: JWT Auth
// =============================================================================

function JwtAuthSection({
  onJwtAuth,
  isJwtPending,
  jwtError,
}: {
  onJwtAuth: (jwt: string) => Promise<void>;
  isJwtPending?: boolean;
  jwtError?: unknown;
}) {
  const [jwt, setJwt] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jwt.trim()) return;
    await onJwtAuth(jwt.trim());
  };

  return (
    <div className="border border-(--widget-border) rounded-(--widget-radius) overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <KeyIcon className="w-3.5 h-3.5" />
          Sign in with JWT
        </span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-200 ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <form onSubmit={handleSubmit} className="px-3 pb-3 pt-1 space-y-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-jwt-token"
                className="text-xs font-medium text-(--widget-muted) tracking-[-0.12px]"
              >
                JWT Token
              </label>
              <textarea
                id="login-jwt-token"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="Paste your JWT token here..."
                rows={3}
                disabled={isJwtPending}
                className="w-full px-3 py-2 text-sm bg-(--widget-bg) text-(--widget-fg) border border-(--widget-border) rounded-(--widget-radius) placeholder:text-(--widget-muted) focus:outline-none focus:ring-2 focus:ring-(--widget-accent) focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-[11px] leading-relaxed"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              loading={isJwtPending}
              disabled={!jwt.trim()}
            >
              <KeyIcon className="w-4 h-4" />
              Authenticate
            </Button>
            <InlineError error={jwtError} />
          </form>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// OAUTH COMPLETING CARD
// =============================================================================

/**
 * Full-screen loading card shown when completing an OAuth redirect
 */
export function OAuthCompletingCard() {
  return (
    <WidgetCard title="Signing In" subtitle="Completing authentication...">
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
      </div>
    </WidgetCard>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Reusable login form for all demo apps.
 *
 * Renders available auth methods based on provided props:
 * - Email OTP (if `emailEnabled` and `onSendEmailOTP` provided)
 * - Social OAuth (if `socialProviders` has entries)
 * - External JWT (if `jwtEnabled` and `onJwtAuth` provided)
 *
 * Each section is self-contained and conditionally rendered.
 *
 * @example
 * ```tsx
 * <LoginForm
 *   emailEnabled={isEmailAuthEnabled()}
 *   onSendEmailOTP={async (email) => { ... }}
 *   socialProviders={getEnabledSocialProviders()}
 *   onSocialSignIn={async (provider) => { ... }}
 *   jwtEnabled={isExternalAuthEnabled()}
 *   onJwtAuth={async (jwt) => { ... }}
 * />
 * ```
 */
export function LoginForm({
  emailEnabled,
  onSendEmailOTP,
  isSendingOTP,
  sendOTPError,
  socialProviders,
  onSocialSignIn,
  socialAuthError,
  onHandleOAuthRedirect,
  jwtEnabled,
  onJwtAuth,
  isJwtPending,
  jwtError,
  className,
}: LoginFormProps) {
  const [isCompletingOAuth, setIsCompletingOAuth] = useState(() => {
    // Detect OAuth params synchronously so we show the spinner on first render
    // instead of flashing the login form while the async handler runs.
    if (typeof window === "undefined" || !onHandleOAuthRedirect) return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.has("dynamicOauthCode") ||
      params.has("dynamicOauthState") ||
      (params.has("code") && params.has("state"))
    );
  });
  const [oauthError, setOauthError] = useState<Error | null>(null);
  const oauthHandled = useRef(false);

  // Handle OAuth redirect on mount
  useEffect(() => {
    if (!onHandleOAuthRedirect || oauthHandled.current) return;
    oauthHandled.current = true;

    const handle = async () => {
      try {
        const isRedirect = await onHandleOAuthRedirect();
        if (!isRedirect) {
          // No redirect detected — show login form
          setIsCompletingOAuth(false);
        }
        // On success, keep spinner visible until navigation completes
      } catch (error) {
        setOauthError(error as Error);
        setIsCompletingOAuth(false);
      }
    };

    handle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isCompletingOAuth) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <Spinner size="lg" />
        <p className="text-sm text-(--widget-muted)">
          Completing authentication...
        </p>
      </div>
    );
  }

  const hasEmail = emailEnabled && onSendEmailOTP;
  const hasSocial =
    socialProviders && socialProviders.length > 0 && onSocialSignIn;
  const hasJwt = jwtEnabled && onJwtAuth;

  return (
    <div className={cn("space-y-4", className)}>
      {hasEmail && (
        <EmailOtpSection
          onSendEmailOTP={onSendEmailOTP}
          isSendingOTP={isSendingOTP}
          sendOTPError={sendOTPError}
        />
      )}

      {hasSocial && (
        <SocialProvidersSection
          providers={socialProviders}
          onSocialSignIn={onSocialSignIn}
          socialAuthError={socialAuthError || oauthError}
          showDivider={!!hasEmail}
        />
      )}

      {hasJwt && (
        <JwtAuthSection
          onJwtAuth={onJwtAuth}
          isJwtPending={isJwtPending}
          jwtError={jwtError}
        />
      )}
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
