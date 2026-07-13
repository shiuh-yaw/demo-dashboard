"use client";

/**
 * JWT Generator screen — in-card port of the /jwt dev tool (Q-017
 * slice 1). Mints a test JWT via POST /api/dev/jwt and can sign in with
 * it directly. While mounted it switches the scenario page's code panel
 * to the JWT setup instructions (PanelSection bridge); unmounting
 * restores the default panel. Sign-in success auto-redirects to the
 * dashboard via useNavigation's isLoggedIn effect — no router involved.
 */

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, CopyButton, Input, WidgetCard } from "@dynamic-demos/ui";
import { useJwtAuth } from "@/hooks/use-mutations";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function JwtGeneratorScreen({
  navigation,
}: {
  navigation: NavigationReturn;
}) {
  const [sub, setSub] = useState(() => crypto.randomUUID());
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");
  const jwtAuth = useJwtAuth();

  usePanelSectionEffect("jwt-setup");

  /** Generate a JWT token and return it (or null on error). */
  const generateToken = async (): Promise<string | null> => {
    setError("");
    setToken("");
    const res = await fetch("/api/dev/jwt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sub: sub.trim() || undefined,
        email: email.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to generate JWT");
      return null;
    }
    setToken(data.token);
    return data.token;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndSignIn = async () => {
    setIsSigningIn(true);
    try {
      const jwt = await generateToken();
      if (!jwt) return;
      await jwtAuth.mutateAsync(jwt);
      // Auth state flips → useNavigation auto-redirects to the dashboard.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setIsSigningIn(false);
    }
  };

  const isConfigError = error.includes("not configured");

  return (
    <WidgetCard
      title="JWT Generator"
      subtitle="External JWT auth testing"
      onBack={navigation.goToAuth}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <Input
            label="Subject (user ID)"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="e.g. user-123"
          />
          <Input
            label={
              <span className="flex items-center gap-1">
                Email
                <span className="font-normal text-(--brand-muted)">
                  (optional)
                </span>
              </span>
            }
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={isSigningIn}
            >
              Generate
            </Button>
            <Button
              className="group flex-[2]"
              onClick={handleGenerateAndSignIn}
              loading={isSigningIn}
              disabled={isGenerating}
            >
              Generate &amp; Sign In
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-enabled:group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-(--brand-radius-sm) border border-(--brand-error) bg-(--brand-status-failed-bg) p-3 text-xs text-(--brand-status-failed-fg)">
            {error}
            {isConfigError ? (
              <span className="mt-1 block text-(--brand-muted)">
                Follow the setup steps in the panel on the right, then try
                again.
              </span>
            ) : null}
          </div>
        ) : null}

        {token ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-(--brand-muted)">Token</span>
              <CopyButton text={token} size="sm" label="Copy token" />
            </div>
            <textarea
              readOnly
              value={token}
              rows={4}
              className="w-full resize-none rounded-lg border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2 font-mono text-[11px] leading-relaxed text-(--brand-fg)"
            />
          </div>
        ) : null}
      </div>
    </WidgetCard>
  );
}
