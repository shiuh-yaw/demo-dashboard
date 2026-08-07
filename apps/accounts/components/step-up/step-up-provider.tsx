"use client";

/**
 * Step-up host: the one place this app collects a credential and mints a
 * scoped elevated access token.
 *
 * Signer and member mutations are gated on that token, and the JavaScript SDK
 * ships no UI for it, so every gated call goes through `withStepUp(scope, fn)`:
 * check, prompt if required, then run `fn` - by which point the SDK holds a
 * matching token and attaches it automatically.
 *
 * @see https://www.dynamic.xyz/docs/javascript/building-ui/step-up-authentication
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, Dialog, DialogContent, DialogTitle, Input } from "@dynamic-demos/ui";
import {
  additionalScopesFor,
  authenticatePasskey,
  authenticateTotp,
  checkStepUpAuth,
  sendEmailOTP,
  verifyOTP,
  type OTPVerification,
  type StepUpCredentialOption,
  type TokenScope,
} from "@/lib/dynamic";
import { ErrorMessage } from "@/components/error-message";

interface StepUpApi {
  /**
   * Run `action` with an elevated token for `scope`, prompting for
   * verification only when the SDK says one is required.
   *
   * Rejects if the user cancels, so a caller's `catch` covers both a declined
   * prompt and a failed mutation with one path.
   */
  withStepUp: <T>(scope: TokenScope, action: () => Promise<T>) => Promise<T>;
}

const StepUpContext = createContext<StepUpApi | null>(null);

export function useStepUp(): StepUpApi {
  const api = useContext(StepUpContext);
  if (!api) {
    throw new Error("useStepUp must be used inside <StepUpProvider>");
  }
  return api;
}

/** Credentials this app can verify. Anything else is surfaced as unsupported. */
const SUPPORTED_FORMATS = new Set(["email", "totp", "passkey"]);

function credentialLabel(credential: StepUpCredentialOption): string {
  switch (credential.format) {
    case "email":
      return credential.alias
        ? `Email code to ${credential.alias}`
        : "Email code";
    case "totp":
      return "Authenticator app code";
    case "passkey":
      return "Passkey";
    case "phoneNumber":
      return credential.alias ? `Text to ${credential.alias}` : "Text message";
    case "oauth":
      return credential.alias ? `Social (${credential.alias})` : "Social login";
    case "blockchain":
      return "Wallet signature";
    default:
      return credential.format;
  }
}

type Phase = "pick" | "code" | "working";

interface Pending {
  scope: TokenScope;
  credentials: StepUpCredentialOption[];
}

interface Resolver {
  resolve: () => void;
  reject: (error: Error) => void;
}

export function StepUpProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [selected, setSelected] = useState<StepUpCredentialOption | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<unknown>(null);
  // The email/SMS challenge in flight, needed alongside the user's code.
  const otpRef = useRef<OTPVerification | null>(null);
  // The promise waiting on this prompt. A ref, not state: settling must happen
  // exactly once, and a state updater can run twice under StrictMode.
  const resolverRef = useRef<Resolver | null>(null);

  const settle = useCallback((outcome: "completed" | "cancelled") => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setPending(null);
    setPhase("pick");
    setSelected(null);
    setCode("");
    setError(null);
    otpRef.current = null;
    if (!resolver) return;
    if (outcome === "completed") resolver.resolve();
    else resolver.reject(new Error("Verification cancelled"));
  }, []);

  const withStepUp = useCallback(
    async <T,>(scope: TokenScope, action: () => Promise<T>): Promise<T> => {
      const { isRequired, credentials } = await checkStepUpAuth({ scope });
      if (isRequired) {
        if (credentials.length === 0) {
          // The SDK fails closed with an empty list when its check request
          // fails, so opening the picker would be a dead end. Crucially, an
          // empty list does NOT mean the user has no credential - a rejected
          // session produces exactly the same shape, and the SDK swallows the
          // cause. Naming only the credential case sent readers to the Dynamic
          // dashboard to fix a session problem, so say both.
          throw new Error(
            "Could not start verification. Your session may have expired - sign out and sign in again. If that does not help, add an email, an authenticator app, or a passkey to this user in the Dynamic dashboard.",
          );
        }
        await new Promise<void>((resolve, reject) => {
          // A prompt already open means a stale caller; cancel it so only one
          // promise is ever outstanding.
          resolverRef.current?.reject(new Error("Verification cancelled"));
          resolverRef.current = { resolve, reject };
          setPending({ scope, credentials });
          setPhase("pick");
          setSelected(null);
          setCode("");
          setError(null);
          otpRef.current = null;
        });
      }
      return action();
    },
    [],
  );

  /** Scopes to mint in one go, so the next mutation needs no second prompt. */
  const requestedScopes = pending
    ? [pending.scope, ...(additionalScopesFor(pending.scope) ?? [])]
    : [];

  const pickCredential = async (credential: StepUpCredentialOption) => {
    setError(null);
    setSelected(credential);

    if (!SUPPORTED_FORMATS.has(credential.format)) {
      setSelected(null);
      setError(
        new Error(
          `${credentialLabel(credential)} verification is not wired into this demo. Pick an email code, an authenticator app, or a passkey.`,
        ),
      );
      return;
    }

    if (credential.format === "passkey") {
      setPhase("working");
      try {
        await authenticatePasskey({ requestedScopes });
        settle("completed");
      } catch (caught) {
        setPhase("pick");
        setSelected(null);
        setError(caught);
      }
      return;
    }

    if (credential.format === "totp") {
      // No challenge to send - the code comes from the user's device.
      otpRef.current = null;
      setPhase("code");
      return;
    }

    // Email: send the challenge, then collect the code.
    setPhase("working");
    try {
      otpRef.current = await sendEmailOTP({ email: credential.alias ?? "" });
      setPhase("code");
    } catch (caught) {
      setPhase("pick");
      setSelected(null);
      setError(caught);
    }
  };

  const submitCode = async () => {
    if (!code.trim()) return;
    setError(null);
    setPhase("working");
    try {
      const otpVerification = otpRef.current;
      if (otpVerification) {
        await verifyOTP({
          otpVerification,
          verificationToken: code.trim(),
          requestedScopes,
        });
      } else {
        await authenticateTotp({ code: code.trim(), requestedScopes });
      }
      settle("completed");
    } catch (caught) {
      setPhase("code");
      setError(caught);
    }
  };

  return (
    <StepUpContext.Provider value={{ withStepUp }}>
      {children}
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && phase !== "working") settle("cancelled");
        }}
      >
        <DialogContent
          className="sm:max-w-[420px]"
          showCloseButton={phase !== "working"}
        >
          <DialogTitle className="text-base font-semibold text-(--brand-fg)">
            Verify it&apos;s you
          </DialogTitle>
          <p className="text-xs leading-relaxed text-(--brand-muted)">
            {phase === "code"
              ? "Enter the verification code to authorize this change."
              : "Changing who can sign or administer this account needs fresh verification."}
          </p>

          {phase === "pick" && (
            <div className="flex flex-col gap-2">
              {pending?.credentials.map((credential) => (
                <Button
                  key={credential.id}
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => void pickCredential(credential)}
                >
                  {credentialLabel(credential)}
                </Button>
              ))}
            </div>
          )}

          {phase === "code" && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitCode();
              }}
            >
              <Input
                label="Verification code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="6-digit code"
                maxLength={8}
                autoFocus
                inputMode="numeric"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setPhase("pick");
                    setSelected(null);
                    setCode("");
                    setError(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!code.trim()}
                >
                  Verify
                </Button>
              </div>
            </form>
          )}

          {phase === "working" && (
            <p className="py-4 text-center text-sm text-(--brand-muted)">
              {selected?.format === "passkey"
                ? "Waiting for your passkey…"
                : "Verifying…"}
            </p>
          )}

          <ErrorMessage error={error} />
        </DialogContent>
      </Dialog>
    </StepUpContext.Provider>
  );
}
