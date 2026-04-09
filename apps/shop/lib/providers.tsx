"use client";

import { ThemeProvider } from "@dynamic-demos/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicClientProvider } from "@/components/DynamicClientProvider";
import { CartProvider } from "@/lib/cart-context";
import { CheckoutProvider } from "@/lib/checkout-context";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <DynamicClientProvider>
          <CartProvider>
            <CheckoutProvider>
              {children}
            </CheckoutProvider>
          </CartProvider>
        </DynamicClientProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
