import { RemittanceAuthLayout } from "@/components/ui/remittance-auth-layout";

/**
 * Layout for auth flow: login and KYC within config routes.
 * Logo above the card, matching wallet app pattern.
 */
export default function ConfigAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RemittanceAuthLayout>{children}</RemittanceAuthLayout>;
}
