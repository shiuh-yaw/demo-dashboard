import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Providers from "@/lib/providers";
import { isDashboardAuthenticated } from "@/lib/auth/session";
import { getSessionUser, GTM_DENIED_PATH } from "@/lib/auth/gtm";
import DashboardLoginForm from "@/components/login-form";
import { Sidebar } from "@/components/sidebar";

interface OperatorLayoutProps {
  children: React.ReactNode;
}

/**
 * Operator Layout
 *
 * Auth boundary for the operator UI. No Dynamic session -> login form. A
 * valid session that is off-domain, deactivated, or otherwise not allowlisted
 * -> the denied page (the allowlist thus applies to every operator URL).
 * Only an allowlisted `User` reaches the app. Nav is cosmetic; every mutation
 * re-checks server-side.
 */
export default async function OperatorLayout({
  children,
}: OperatorLayoutProps) {
  const hasSession = await isDashboardAuthenticated();

  if (!hasSession) {
    return (
      <Providers>
        <div className="relative min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
          <Link
            href="/"
            className="absolute left-6 top-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to demos
          </Link>
          <DashboardLoginForm />
        </div>
      </Providers>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect(GTM_DENIED_PATH);

  return (
    <Providers>
      <div className="min-h-screen bg-[#f8fafc] flex">
        <Sidebar
          user={{ sub: user.dynamicUserId ?? user.id, email: user.email }}
        />
        <main className="flex-1 ml-16 transition-all duration-200">
          <div className="max-w-5xl mx-auto p-8">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
