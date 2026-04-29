import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { figtree, ufficio } from "./fonts.js";

export const metadata: Metadata = {
  title: "SPARK26 — Pay your registration",
  description: "Pay your Fireblocks SPARK26 registration with crypto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${ufficio.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
