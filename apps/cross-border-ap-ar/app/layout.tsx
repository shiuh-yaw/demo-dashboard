import type { Metadata } from "next";
import { DisbursementProvider } from "@/contexts/disbursement-context";
import { TopBar } from "@/components/top-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Etsy Finance Operations — Seller Disbursements",
  description:
    "Cross-border seller disbursement via stablecoin sandwich: USD → USDC → MXN via SPEI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DisbursementProvider>
          <div className="min-h-screen flex flex-col">
            <TopBar />
            <main className="flex-1 overflow-y-auto scrollbar-thin">
              {children}
            </main>
          </div>
        </DisbursementProvider>
      </body>
    </html>
  );
}
