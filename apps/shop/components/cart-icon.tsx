"use client";

import { useCart } from "@/lib/cart-context";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export function CartIcon() {
  const { totalItems } = useCart();

  return (
    <Link href="/cart" className="relative inline-flex items-center">
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-[var(--brand-primary,#335cff)] text-white rounded-full text-xs min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium">
          {totalItems}
        </span>
      )}
    </Link>
  );
}
