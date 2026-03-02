/**
 * Edit Wallet Config Page
 *
 * Page for editing an existing Wallet configuration.
 */

import { notFound } from "next/navigation";
import { getWalletConfig } from "@/lib/actions/wallets";
import { WalletConfigEditor } from "./wallet-config-editor";

interface EditWalletConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWalletConfigPage({
  params,
}: EditWalletConfigPageProps) {
  const { id } = await params;
  const result = await getWalletConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <WalletConfigEditor config={result.data} />;
}
