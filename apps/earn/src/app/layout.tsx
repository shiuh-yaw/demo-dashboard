import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from "sonner";
import { DynamicInit } from "@/components/dynamic-init";
import "@/app/globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Earn Dashboard",
  description: "Earn Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <DynamicInit />
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
