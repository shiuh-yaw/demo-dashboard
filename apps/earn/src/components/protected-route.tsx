"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { checkAuthStatus } from "@/lib/dynamic";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      // Small delay to allow Dynamic SDK to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      const authenticated = checkAuthStatus();
      setIsAuthenticated(authenticated);
      setIsChecking(false);

      // Redirect to login if not authenticated (except if already on login page)
      if (!authenticated && pathname !== "/login") {
        router.push("/login");
        return;
      }

      // Redirect to earn page if authenticated and on login page
      if (authenticated && pathname === "/login") {
        router.push("/earn");
      }
    }

    checkAuth();
  }, [router, pathname]);

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earn-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-earn-text-primary mx-auto mb-4"></div>
          <p className="text-earn-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated && pathname === "/login") {
    return <>{children}</>;
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Render protected pages with header and sidebar
  // Note: This component is not currently used - the dashboard layout handles its own header/sidebar
  return (
    <div className="min-h-screen bg-earn-light flex flex-col">
      <Header user={null} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-16">{children}</main>
      </div>
    </div>
  );
}

