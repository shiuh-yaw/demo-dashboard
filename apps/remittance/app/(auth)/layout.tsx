import { RemittanceAuthLayout } from "@/components/ui/remittance-auth-layout";

/**
 * Layout for auth flow: login and KYC.
 * Logo above the card, matching wallet app pattern.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RemittanceAuthLayout>{children}</RemittanceAuthLayout>;
}
