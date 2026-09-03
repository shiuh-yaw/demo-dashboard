"use client";

/**
 * Beat 1 (and the "second device" of beat 4). The sign-in card on the
 * scenario page: the shared LoginForm (email OTP + the environment's social
 * providers) under the exchange's own mark. Nothing here says wallet,
 * address, key or phrase - on purpose. Signed-in sessions bounce straight to
 * the portfolio with no interstitial.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, LoginForm, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { useBackend } from "@/lib/backend";
import { useSession } from "@/lib/session/store";
import type { Provider } from "@/lib/session/types";
import { Wordmark } from "@/components/wordmark";
import { Badge, ErrorNote, Icon } from "@/components/primitives";

export function SignInCard() {
  const backend = useBackend();
  const { state, hydrated } = useSession();
  const router = useRouter();
  const [otp, setOtp] = useState<{ email: string; verification: unknown } | null>(null);
  const [code, setCode] = useState("");

  const signedIn = hydrated && backend.ready && backend.sessionActive && !!state.person && !!state.wallet && !state.deviceLost;
  // The saved session outlived the SDK's: the JWT expired, or the SDK storage
  // was cleared. Same account, same wallet - signing in again picks it back up.
  const expired = hydrated && backend.ready && !backend.sessionActive && !!state.person && !state.deviceLost;
  useEffect(() => {
    if (signedIn) router.replace("/portfolio");
  }, [signedIn, router]);

  const socialSignIn = useCallback(
    async (provider: string) => {
      const p = provider as Provider;
      if (state.deviceLost) await backend.recover(p);
      else await backend.signInWithSocial(p);
    },
    [backend, state.deviceLost],
  );

  const sendEmail = useCallback(
    async (email: string) => {
      const verification = await backend.sendEmailCode(email);
      setOtp({ email, verification });
    },
    [backend],
  );

  const handleOAuthRedirect = useCallback(() => backend.completeOAuthRedirect(), [backend]);

  if (!hydrated || !backend.ready || signedIn) {
    return (
      <WidgetCard>
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      </WidgetCard>
    );
  }

  if (state.recovering) return <RestoringCard />;

  if (otp) {
    return (
      <WidgetCard title="Check your email" subtitle={`Enter the code sent to ${otp.email}`} onBack={() => setOtp(null)}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!code.trim()) return;
            try {
              await backend.verifyEmailCode(otp.verification, code);
            } catch {
              /* shown inline */
            }
          }}
        >
          <Input label="Verification code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6} autoFocus inputMode="numeric" disabled={!!backend.busy} />
          <Button type="submit" className="w-full" loading={!!backend.busy} disabled={!code.trim()}>
            Continue
          </Button>
          <ErrorNote message={backend.error} onDismiss={backend.clearError} />
          {backend.mode === "staged" && <p className="text-xs text-center text-muted">Staged mode: any six digits work.</p>}
        </form>
      </WidgetCard>
    );
  }

  const returning = state.deviceLost && state.knownPerson;

  return (
    <WidgetCard>
      <div className="p-4">
        <div className="flex items-center justify-between mb-5">
          <Wordmark />
          {state.deviceLost && (
            <Badge tone="info">
              <Icon.Phone className="h-3 w-3" /> Device B
            </Badge>
          )}
        </div>
        <h2 className="text-lg font-semibold text-ink">
          {returning ? `Welcome back, ${state.knownPerson!.name.split(" ")[0]}` : expired ? `Welcome back, ${state.person!.name.split(" ")[0]}` : "Welcome back"}
        </h2>
        <p className="text-sm text-muted mt-1 mb-5">
          {returning
            ? "New phone? Sign in the way you always do and your account comes with you."
            : expired
              ? "Your session timed out. Sign in with the same account and your wallet is right where you left it."
              : "Sign in to your account."}
        </p>
        <LoginForm
          emailEnabled={backend.auth.emailEnabled}
          onSendEmailOTP={sendEmail}
          isSendingOTP={backend.busy === "Sending your code"}
          sendOTPError={undefined}
          socialProviders={backend.auth.socialProviders}
          onSocialSignIn={socialSignIn}
          socialAuthError={undefined}
          onHandleOAuthRedirect={handleOAuthRedirect}
          jwtEnabled={false}
        />
        <div className="mt-4">
          <ErrorNote message={backend.error} onDismiss={backend.clearError} />
        </div>
        {backend.busy && (
          <p className="mt-3 text-center text-xs text-muted" aria-live="polite">
            {backend.busy}…
          </p>
        )}
        <p className="mt-5 text-[11px] text-muted text-center">
          {returning
            ? "No recovery phrase. No support ticket. The exchange cannot restore this for you because it never had it."
            : backend.mode === "staged"
              ? "Staged mode: sign-in and key generation are simulated locally."
              : "Testnet only."}
        </p>
      </div>
    </WidgetCard>
  );
}

const STEPS = [
  "Verifying your identity",
  "Locating the encrypted client-share backup",
  "Decrypting on this device through the Encryption Proxy",
  "Refreshing the 2-of-2 with the enclave",
];

function RestoringCard() {
  const backend = useBackend();
  const steps = backend.progress;
  return (
    <WidgetCard title="Restoring your account" subtitle="Your balance and positions never left the network. Only the device did.">
      <ol className="space-y-3 py-1">
        {STEPS.map((label, i) => {
          const idx = steps?.index ?? 0;
          const done = idx > i;
          const active = idx === i;
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className={`h-6 w-6 rounded-full grid place-items-center text-[12px] font-bold ${done ? "bg-up-2 text-up" : active ? "bg-brand-2 text-brand" : "bg-ground text-muted"}`}>
                {done ? "✓" : active ? <Spinner size="sm" /> : i + 1}
              </span>
              <span className={done || active ? "text-ink" : "text-muted"}>{steps && active ? steps.label : label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 rounded-xl bg-ground p-3 text-[12px] text-muted">
        The client-share backup is encrypted so that only a device you have authenticated on can decrypt it. The enclave never sees the client share; the device never sees the server share.
      </p>
    </WidgetCard>
  );
}
