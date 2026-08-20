"use client";

/**
 * Registered second factors, one level down from settings: a list needs room
 * the row has not got.
 *
 * Removing a factor is itself step-up protected - the SDK needs a
 * `credential:unlink` elevated token, so one factor proves the removal of
 * another.
 */

import { useState } from "react";
import { Fingerprint, Plus, Shield, Trash2, X } from "lucide-react";
import {
  Button,
  Spinner,
  Tooltip,
  WidgetCard,
  iconButtonHoverClassName,
} from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { MfaCodeInput } from "@/components/ui/mfa-code-input";
import { SetupMfaScreen } from "@/components/screens/setup-mfa-screen";
import {
  SettingsRowCard,
  settingsRowIconClass,
} from "@/components/ui/settings-row";
import {
  useInvalidateMfaCaches,
  useMfaStatus,
  usePreferredFactor,
} from "@/hooks/use-mfa-status";
import {
  useSecurityFactors,
  type SecurityFactor,
} from "@/hooks/use-security-factors";
import { deleteMfaFactor } from "@/lib/dynamic";

export function SecurityFactorsScreen({ onBack }: { onBack: () => void }) {
  const { factors, isLoading } = useSecurityFactors();
  const { canEnrollMfa, isRequired: mfaRequired } = useMfaStatus();
  const invalidateMfaCaches = useInvalidateMfaCaches();
  const {
    method: deleteMethod,
    canUseTotpInstead: canDeleteWithCode,
    switchToTotp: switchDeleteToTotp,
  } = usePreferredFactor();

  const [enrolling, setEnrolling] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Removing the last factor while 2FA is required strands the user: the
  // wallet locks and the delete itself needs a step-up they can no longer do.
  const isLastFactor = factors.length <= 1 && mfaRequired;

  const confirmDelete = async (factor: SecurityFactor) => {
    if (busy) return;
    if (deleteMethod === "totp" && code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMfaFactor({
        factor: { kind: factor.kind, id: factor.key },
        stepUp: { method: deleteMethod, code: code || undefined },
      });
      setDeletingKey(null);
      setCode("");
      await invalidateMfaCaches();
    } catch (caught) {
      setCode("");
      setError(
        caught instanceof Error ? caught : new Error("Could not remove it."),
      );
    } finally {
      setBusy(false);
    }
  };

  if (enrolling) {
    return (
      <SetupMfaScreen
        onSuccess={() => {
          void invalidateMfaCaches();
          setEnrolling(false);
        }}
        onCancel={() => setEnrolling(false)}
      />
    );
  }

  return (
    <WidgetCard
      title="Two-factor authentication"
      subtitle="Registered factors"
      onBack={onBack}
    >
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size="lg" />
          </div>
        ) : factors.length === 0 ? (
          <p className="py-4 text-center text-sm text-(--brand-muted)">
            Nothing registered yet.
          </p>
        ) : (
          factors.map((factor) => {
            const confirming = deletingKey === factor.key;
            return (
              <SettingsRowCard
                key={factor.key}
                icon={
                  factor.kind === "passkey" ? (
                    <Fingerprint
                      className={settingsRowIconClass}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Shield className={settingsRowIconClass} strokeWidth={1.5} />
                  )
                }
                title={factor.label}
                description={factor.pending ? "Unverified" : factor.meta}
                action={
                  <Tooltip
                    content={
                      isLastFactor
                        ? "2FA is required - add another factor first"
                        : confirming
                          ? "Cancel"
                          : "Remove"
                    }
                  >
                    <span>
                      <button
                        type="button"
                        disabled={isLastFactor || busy}
                        onClick={() => {
                          setError(null);
                          setCode("");
                          setDeletingKey(confirming ? null : factor.key);
                        }}
                        aria-label={
                          confirming
                            ? "Cancel removal"
                            : `Remove ${factor.label}`
                        }
                        className={cn(
                          "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                          "text-(--brand-muted) hover:text-(--brand-fg)",
                          iconButtonHoverClassName,
                        )}
                      >
                        {/* The button toggles, so the icon says which way. */}
                        {confirming ? (
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        ) : (
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        )}
                      </button>
                    </span>
                  </Tooltip>
                }
              >
                {confirming ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs leading-relaxed text-(--brand-muted)">
                        {deleteMethod === "totp"
                          ? "Enter a code from your authenticator to remove this factor."
                          : "Confirm with your passkey to remove this factor."}
                      </p>
                      {canDeleteWithCode && (
                        <button
                          type="button"
                          onClick={switchDeleteToTotp}
                          className="ml-auto shrink-0 cursor-pointer text-xs font-medium text-(--brand-accent) hover:underline"
                        >
                          Use a code
                        </button>
                      )}
                    </div>
                    {deleteMethod === "totp" ? (
                      <MfaCodeInput
                        value={code}
                        onChange={setCode}
                        disabled={busy}
                        autoFocus
                      />
                    ) : null}
                    <ErrorMessage error={error} />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        disabled={busy}
                        onClick={() => setDeletingKey(null)}
                      >
                        Cancel
                      </Button>
                      {/* Destructive at rest, not solid: red text and border
                          on the outline shape, filling only on hover. */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-(--brand-error)/40 text-(--brand-error) hover:border-(--brand-error) hover:bg-(--brand-error)/10 hover:text-(--brand-error)"
                        loading={busy}
                        disabled={deleteMethod === "totp" && code.length !== 6}
                        onClick={() => confirmDelete(factor)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : null}
              </SettingsRowCard>
            );
          })
        )}

        {canEnrollMfa && !isLoading ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setEnrolling(true)}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Add a factor
          </Button>
        ) : null}
      </div>
    </WidgetCard>
  );
}
