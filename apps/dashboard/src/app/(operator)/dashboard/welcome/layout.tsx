import { BrandGateLayout } from "@/components/brand-gate-layout";

/**
 * Standalone chrome for the onboarding gate. The operator layout renders this
 * route outside the sidebar/top-bar shell (see `app/(operator)/layout.tsx`),
 * so the gate owns the full screen: the Dynamic wordmark centered above a
 * single card, no app navigation around it. Shares `BrandGateLayout` with the
 * auth and denied screens - no back link here, unlike auth.
 */
export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrandGateLayout>{children}</BrandGateLayout>;
}
