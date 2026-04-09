"use client";

import { useCart } from "@/lib/cart-context";
import { CartItemRow } from "@/components/cart-item-row";
import { Button, Card, CardContent, CardFooter } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { CartIcon } from "@/components/cart-icon";
import { ShoppingCart } from "lucide-react";
import { useCheckout } from "@/lib/checkout-context";
import { CheckoutModal } from "@/components/checkout/checkout-modal";

export default function CartPage() {
  const { items, totalPrice, totalItems } = useCart();
  const { openCheckout } = useCheckout();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Link href="/" className="text-xl font-semibold hover:opacity-80 transition-opacity">
          Crypto Shop
        </Link>
        <div className="flex items-center gap-2">
          <CartIcon />
          <ThemeToggle />
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">Your Cart</h2>

        {items.length === 0 ? (
          <Card className="bg-card text-card-foreground border-border">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-medium text-lg text-foreground">Your cart is empty</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Browse our collection and add some items!
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card text-card-foreground border-border">
            <CardContent className="p-0">
              <div className="divide-y divide-border px-5">
                {items.map((item) => (
                  <CartItemRow key={item.product.id} item={item} />
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4 border-t border-border pt-5">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">
                  Total ({totalItems} {totalItems === 1 ? "item" : "items"})
                </span>
                <span className="text-lg font-bold">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/">Continue Shopping</Link>
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={openCheckout}
                >
                  Checkout
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}
      </main>

      <CheckoutModal />
    </div>
  );
}
