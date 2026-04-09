"use client";

import { Button } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import { useCart, type CartItem } from "@/lib/cart-context";
import { Minus, Plus, Trash2 } from "lucide-react";

export function CartItemRow({ item }: { item: CartItem }) {
  const { increment, decrement, removeItem } = useCart();

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl">{item.product.emoji}</span>
        <span className="font-medium text-sm truncate">{item.product.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => decrement(item.product.id)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => increment(item.product.id)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <span className="font-semibold text-sm w-20 text-right">
          {formatCurrency(item.product.price * item.quantity)}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => removeItem(item.product.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
