import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Providers from "@/lib/providers";
import { getCurrentUser, isDashboardAuthenticated } from "@/lib/auth/session";
import DashboardLoginForm from "@/components/login-form";
import { Sidebar } from "@/components/sidebar";

interface OperatorLayoutProps {
  children: React.ReactNode;
}

/**
 * Operator Layout
 *
 * Auth boundary for the operator UI. Every route in the (operator) group
 * requires a dashboard session; unauthenticated visitors see the login form.
 * Wraps children with Providers (Dynamic SDK init + theme) — the public
 * (public) group intentionally does not load these.
 */
export default async function OperatorLayout({
  children,
}: OperatorLayoutProps) {
  const isAuthenticated = await isDashboardAuthenticated();
  const user = isAuthenticated ? await getCurrentUser() : null;

  return (
    <Providers>
      {!isAuthenticated ? (
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
      ) : (
        <div className="min-h-screen bg-[#f8fafc] flex">
          <Sidebar user={user ? { sub: user.sub, email: user.email } : null} />
          <main className="flex-1 ml-16 transition-all duration-200">
            <div className="max-w-5xl mx-auto p-8">{children}</div>
          </main>
        </div>
      )}
    </Providers>
  );
}
