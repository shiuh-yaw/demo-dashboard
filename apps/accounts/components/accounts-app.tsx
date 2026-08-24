"use client";

/**
 * The live widget: one screen at a time inside a `WidgetCard`, with all
 * navigation controls inside the card.
 *
 * Screens declare which code-panel section they own via
 * `usePanelSectionEffect`, so walking the flow updates the panel on the right.
 *
 * Transitions are wallet's, exactly: the widget dims to 50% for 150ms, the
 * screen swaps, and it fades back. Nothing moves and nothing is keyed per
 * screen, so the card never jumps position or replays an enter animation.
 */

import { useEffect, useState } from "react";
import { Spinner, WidgetCard } from "@dynamic-demos/ui";
import { useAuth } from "@/hooks/use-auth";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { useMilestoneOnce } from "@/hooks/use-milestone";
import { useNavigation } from "@/hooks/use-navigation";
import { StepUpProvider } from "@/components/step-up/step-up-provider";
import { AccountScreen } from "@/components/screens/account-screen";
import { AccountsScreen } from "@/components/screens/accounts-screen";
import { AddMemberScreen } from "@/components/screens/add-member-screen";
import { AddSignerScreen } from "@/components/screens/add-signer-screen";
import { AddWalletScreen } from "@/components/screens/add-wallet-screen";
import { AuthScreen } from "@/components/screens/auth-screen";
import { CreateAccountScreen } from "@/components/screens/create-account-screen";
import { MembersScreen } from "@/components/screens/members-screen";
import { OtpVerifyScreen } from "@/components/screens/otp-verify-screen";
import { RenameAccountScreen } from "@/components/screens/rename-account-screen";
import { SendTransactionScreen } from "@/components/screens/send-transaction-screen";
import { SignMessageScreen } from "@/components/screens/sign-message-screen";
import { PolicyAddressesScreen } from "@/components/screens/policy-addresses-screen";
import { PolicyDestinationScreen } from "@/components/screens/policy-destination-screen";
import { PolicyLimitsScreen } from "@/components/screens/policy-limits-screen";
import { WalletPoliciesScreen } from "@/components/screens/wallet-policies-screen";
import { WalletSettingsScreen } from "@/components/screens/wallet-settings-screen";
import { WalletSignersScreen } from "@/components/screens/wallet-signers-screen";
import { WalletTransactionsScreen } from "@/components/screens/wallet-transactions-screen";
import { WalletsScreen } from "@/components/screens/wallets-screen";

export function AccountsApp() {
  // Lives here, not on the accounts screen: that screen unmounts on every
  // navigation, so revealing the hidden accounts and stepping into one lost
  // the reveal on the way back.
  const [showHidden, setShowHidden] = useState(false);
  const isClientReady = useClientInitialized();
  const isLoggedIn = useAuth();
  const navigation = useNavigation(isLoggedIn);
  const { screen, isReady, isTransitioning } = navigation;
  const milestoneOnce = useMilestoneOnce();

  useEffect(() => {
    if (isLoggedIn) milestoneOnce("signed_in");
  }, [isLoggedIn, milestoneOnce]);

  // NO eager refreshAuth here, deliberately.
  //
  // `refreshAuth` ROTATES the token - it is a full verify call that issues a
  // new JWT and invalidates the old one. Calling it on mount meant two racing
  // rotations in dev (StrictMode runs effects twice) sharing one starting
  // token: whichever the server handles second arrives already rotated out and
  // 401s, and every call after it inherits the broken session. That is the
  // `POST /refresh 401` followed by a wall of 401s.
  //
  // It is also unnecessary. The SDK refreshes auth itself at the points that
  // need it - the compiled `createWalletForBusinessAccount` ends with
  // `__refreshAuth_wrapped(client)` - which is why the SDK's own react-demo
  // never refreshes on mount either. If a specific call ever does need a fresh
  // token, refresh at that call site, once, not on every mount.

  if (!isClientReady || !isReady) {
    return (
      <WidgetCard>
        <div className="flex min-h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <StepUpProvider>
      <div
        className={`transition-opacity duration-150 ${
          isTransitioning ? "opacity-50" : "opacity-100"
        }`}
      >
        {screen.type === "auth" && <AuthScreen navigation={navigation} />}

        {screen.type === "otp-verify" && (
          <OtpVerifyScreen
            email={screen.email}
            otpVerification={screen.otpVerification}
            navigation={navigation}
          />
        )}

        {screen.type === "accounts" && (
          <AccountsScreen
            navigation={navigation}
            showHidden={showHidden}
            onShowHiddenChange={setShowHidden}
          />
        )}

        {screen.type === "create-account" && (
          <CreateAccountScreen navigation={navigation} />
        )}

        {screen.type === "account" && (
          <AccountScreen
            businessAccountId={screen.businessAccountId}
            navigation={navigation}
          />
        )}

        {screen.type === "rename-account" && (
          <RenameAccountScreen
            businessAccountId={screen.businessAccountId}
            currentName={screen.currentName}
            navigation={navigation}
          />
        )}

        {screen.type === "wallets" && (
          <WalletsScreen
            businessAccountId={screen.businessAccountId}
            navigation={navigation}
          />
        )}

        {screen.type === "wallet-settings" && (
          <WalletSettingsScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            navigation={navigation}
          />
        )}

        {screen.type === "wallet-policies" && (
          <WalletPoliciesScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            signer={screen.signer}
            navigation={navigation}
          />
        )}

        {screen.type === "policy-addresses" && (
          <PolicyAddressesScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            signer={screen.signer}
            navigation={navigation}
          />
        )}

        {screen.type === "policy-limits" && (
          <PolicyLimitsScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            signer={screen.signer}
            navigation={navigation}
          />
        )}

        {screen.type === "policy-destination" && (
          <PolicyDestinationScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            signer={screen.signer}
            rule={screen.rule}
            navigation={navigation}
          />
        )}

        {screen.type === "wallet-signers" && (
          <WalletSignersScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            navigation={navigation}
          />
        )}

        {screen.type === "wallet-transactions" && (
          <WalletTransactionsScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            navigation={navigation}
          />
        )}

        {screen.type === "send" && (
          <SendTransactionScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            navigation={navigation}
          />
        )}

        {screen.type === "sign-message" && (
          <SignMessageScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            navigation={navigation}
          />
        )}

        {screen.type === "add-wallet" && (
          <AddWalletScreen
            businessAccountId={screen.businessAccountId}
            navigation={navigation}
          />
        )}

        {screen.type === "add-signer" && (
          <AddSignerScreen
            businessAccountId={screen.businessAccountId}
            wallet={screen.wallet}
            navigation={navigation}
          />
        )}

        {screen.type === "members" && (
          <MembersScreen
            businessAccountId={screen.businessAccountId}
            navigation={navigation}
          />
        )}

        {screen.type === "add-member" && (
          <AddMemberScreen
            businessAccountId={screen.businessAccountId}
            navigation={navigation}
          />
        )}
      </div>
    </StepUpProvider>
  );
}
