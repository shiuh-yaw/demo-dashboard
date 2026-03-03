import { getServerUserData } from "@/lib/auth/server-auth";
import { SettingsScreen } from "@/components/screens/settings-screen";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConfigSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const userData = await getServerUserData({
    redirectToLogin: true,
    loginPath: `/r/${id}/login`,
  });
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
