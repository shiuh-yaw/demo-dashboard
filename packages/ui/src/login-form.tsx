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
import { ArrowRight, ChevronDown, ExternalLink, Key, Mail } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { Button } from "./button";
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
  /** Optional href to a helper page that mints a test JWT.
   *  When set, a "Generate a test token" link renders in the JWT panel header. */
  jwtHelperHref?: string;
  /** In-place alternative to `jwtHelperHref`: when set, the JWT section
   *  renders as a single "Sign in with JWT" button that calls this —
   *  no expanding paste-token form. The app owns the rest of the flow
   *  (e.g. an in-card generator screen). Takes precedence over
   *  `jwtHelperHref`. */
  onJwtHelperClick?: () => void;

  // ── General ──────────────────────────────────────────────────
  /** Additional CSS classes for the root element */
  className?: string;
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
            disabled={isSendingOTP}
            className={cn(
              "flex h-10 w-full rounded-lg border pl-10 pr-3 py-2 text-sm",
              "bg-[var(--widget-bg,#ffffff)] text-[var(--widget-fg,#252731)]",
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
        className="group w-full h-10"
        loading={isSendingOTP}
        disabled={!email.trim()}
      >
        Continue
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-enabled:group-hover:translate-x-0.5" />
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
          <div className="flex-1 h-px bg-[var(--widget-border,#e1e4ea)]" />
          <span className="text-xs text-[var(--widget-muted,#9a9a9a)]">
            or sign in with
          </span>
          <div className="flex-1 h-px bg-[var(--widget-border,#e1e4ea)]" />
        </div>
      )}

      {providers.map((provider) => (
        <Button
          key={provider}
          variant="outline"
          className="w-full h-10 bg-[var(--widget-bg,#ffffff)] border-[var(--widget-border,#e1e4ea)] hover:bg-[var(--widget-row-hover,#eef1f1)]"
          onClick={() => handleSignIn(provider)}
          disabled={loadingProvider !== null}
          loading={loadingProvider === provider}
        >
          <SocialIcon name={provider} className="w-4 h-4" />
          Sign in with {capitalize(provider)}
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
  jwtHelperHref,
  onJwtHelperClick,
}: {
  onJwtAuth: (jwt: string) => Promise<void>;
  isJwtPending?: boolean;
  jwtError?: unknown;
  jwtHelperHref?: string;
  onJwtHelperClick?: () => void;
}) {
  const [jwt, setJwt] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jwt.trim()) return;
    await onJwtAuth(jwt.trim());
  };

  // Hand-off mode: the app owns the JWT flow (e.g. an in-card generator
  // screen), so the section is just a button — no paste-token form.
  if (onJwtHelperClick) {
    return (
      <button
        type="button"
        onClick={onJwtHelperClick}
        className="group w-full h-10 flex items-center justify-between px-4 rounded-lg border border-[var(--widget-border,#e1e4ea)] bg-[var(--widget-bg,#ffffff)] hover:bg-[var(--widget-row-hover,#eef1f1)] text-sm font-medium text-[var(--widget-fg,#252731)] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[var(--widget-muted,#9a9a9a)]" />
          Sign in with JWT
        </span>
        <ArrowRight className="w-4 h-4 text-[var(--widget-muted,#9a9a9a)] transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--widget-border,#e1e4ea)] bg-[var(--widget-bg,#ffffff)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-10 flex items-center justify-between px-4 hover:bg-[var(--widget-row-hover,#eef1f1)] text-sm font-medium text-[var(--widget-fg,#252731)] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[var(--widget-muted,#9a9a9a)]" />
          Sign in with JWT
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--widget-muted,#9a9a9a)] transition-transform duration-200 ${
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
          <form
            onSubmit={handleSubmit}
            className="px-4 pb-4 pt-1 space-y-4 border-t border-[var(--widget-border,#e1e4ea)]"
          >
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-jwt-token"
                  className="block text-xs font-normal text-[var(--widget-muted,#9a9a9a)]"
                >
                  JWT Token
                </label>
                {onJwtHelperClick ? (
                  <button
                    type="button"
                    onClick={onJwtHelperClick}
                    className="flex items-center gap-1 text-[11px] text-[var(--widget-primary,#335cff)] hover:underline"
                  >
                    Generate a test token
                  </button>
                ) : jwtHelperHref ? (
                  <a
                    href={jwtHelperHref}
                    className="flex items-center gap-1 text-[11px] text-[var(--widget-primary,#335cff)] hover:underline"
                  >
                    Generate a test token
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : null}
              </div>
              <textarea
                id="login-jwt-token"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="Paste your JWT token here..."
                rows={3}
                disabled={isJwtPending}
                className="w-full px-3 py-2 text-sm bg-[var(--widget-bg,#ffffff)] text-[var(--widget-fg,#252731)] border border-[var(--widget-border,#e1e4ea)] rounded-lg placeholder:text-[var(--widget-muted,#9a9a9a)] focus:outline-none focus:ring-1 focus:ring-[var(--widget-primary,#335cff)] focus:border-[var(--widget-primary,#335cff)] disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-[11px] leading-relaxed"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full h-10 bg-[var(--widget-bg,#ffffff)] border-[var(--widget-border,#e1e4ea)] hover:bg-[var(--widget-row-hover,#eef1f1)]"
              loading={isJwtPending}
              disabled={!jwt.trim()}
            >
              <Key className="w-4 h-4" />
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
    <WidgetCard>
      <div className="flex items-center justify-center px-4 py-8">
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
  jwtHelperHref,
  onJwtHelperClick,
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
        <p className="text-sm text-[var(--widget-muted,#9a9a9a)]">
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
          jwtHelperHref={jwtHelperHref}
          onJwtHelperClick={onJwtHelperClick}
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
