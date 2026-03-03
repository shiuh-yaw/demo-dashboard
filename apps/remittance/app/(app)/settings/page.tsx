import { getServerUserData } from "@/lib/auth/server-auth";
import { SettingsScreen } from "@/components/screens/settings-screen";

export default async function SettingsPage() {
  const userData = await getServerUserData();
  const walletAddress = userData?.walletAddress ?? "";
  const kycApproved = userData?.kycApproved ?? false;
  const bankingOnboardingComplete = userData?.hasSubmittedBankDetails ?? false;

  return (
    <SettingsScreen
      walletAddress={walletAddress}
      kycApproved={kycApproved}
      bankingOnboardingComplete={bankingOnboardingComplete}
      initialRecipients={userData?.knownRecipients ?? []}
      hasStubCard={!!userData?.stubCard}
      cardBalance={userData?.cardDeposits ?? 0}
      saveBalance={userData?.saveDeposits ?? 0}
    />
  );
}
