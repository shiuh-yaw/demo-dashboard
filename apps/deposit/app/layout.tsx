import type { Metadata } from "next";
import { Providers } from "./providers";
import { NetworkBar } from "./network-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deposit Demo — Dynamic + Fireblocks",
  description: "Deposit funds via Fireblocks vault with AML screening",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-[400px]">
            <Providers>
              <NetworkBar />
              {children}
            </Providers>
          </div>
        </div>
      </body>
    </html>
  );
}
