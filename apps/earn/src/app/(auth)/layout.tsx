/**
 * Auth Layout
 *
 * Layout for authentication pages (login, callback, etc.)
 * Provides the centered container and white card wrapper
 */

import { AppLogo } from "@/components/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-earn-light">
      <div className="bg-white border border-earn-border rounded-lg p-8 max-w-md w-full shadow-lg">
        <div className="flex justify-center mb-2">
          <AppLogo className="h-6 w-auto" />
        </div>
        {children}
      </div>
    </div>
  );
}
