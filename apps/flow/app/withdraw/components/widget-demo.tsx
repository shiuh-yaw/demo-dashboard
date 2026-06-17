"use client";

/**
 * Withdraw demo slot — entry point.
 *
 * Renders a landing card; tapping its CTA hands off to PlatformShell,
 * which owns the wallet provisioning lifecycle and routes between
 * dashboard / deposit / withdraw sub-flows.
 *
 * Narrative:
 *   1. User connects once (Dynamic provisions an embedded EVM WaaS
 *      wallet on Base via SIWE).
 *   2. They land on a platform-style dashboard showing aggregate USDC
 *      balance, with Deposit + Withdraw actions.
 *   3. Deposit bridges any source asset on any chain INTO the embedded
 *      wallet as USDC@Base. Withdraw routes the platform USDC out to
 *      any external wallet on any (chain, token) pair.
 *
 * Flows are created server-side at review time (`POST /api/checkouts`)
 * for deposit + withdraw once destination and amount are known.
 */

import { useEffect, useState } from "react";
import { ScenarioCard } from "@/components/scenario-card";
import { WithdrawIllustration } from "./withdraw-illustration";
import { PlatformShell } from "./platform-shell";
import { logout } from "@/lib/dynamic/flow-sdk";
import { waitForDynamicClientInitialized } from "@/lib/dynamic/client";

export function WithdrawWidgetDemo() {
  const [started, setStarted] = useState(false);

  // Drop connect-only wallet state from /checkout or /deposit when the
  // user navigates here — withdraw owns its own auth + WaaS lifecycle.
  useEffect(() => {
    void (async () => {
      await waitForDynamicClientInitialized();
      await logout();
    })();
  }, []);
  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      {started ? (
        <PlatformShell onBack={() => setStarted(false)} />
      ) : (
        <LandingCard onStart={() => setStarted(true)} />
      )}
    </div>
  );
}

function LandingCard({ onStart }: { onStart: () => void }) {
  return (
    <ScenarioCard
      eyebrow="Cash out"
      title="Open your platform wallet"
      body="Sign in and Dynamic provisions an embedded wallet you control. Deposit funds, then withdraw to any external wallet — pick the settlement token + chain when you do."
      ctaLabel="Continue to platform"
      onCta={onStart}
      illustration={<WithdrawIllustration />}
    />
  );
}
