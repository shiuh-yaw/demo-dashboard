"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Button } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import { useCart } from "@/lib/cart-context";
import { Check } from "lucide-react";
import type { Product } from "@/data/products";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1200);
    return () => clearTimeout(t);
  }, [added]);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
  };

  return (
    <Card className="bg-card text-card-foreground border-border">
      <CardContent className="flex flex-col items-center gap-3 p-6">
        <span className="text-4xl">{product.emoji}</span>
        <div className="text-center">
          <h3 className="font-medium text-sm text-foreground">{product.name}</h3>
          <p className="text-muted-foreground text-xs mt-1">{product.description}</p>
        </div>
        <p className="font-semibold text-lg text-foreground">{formatCurrency(product.price)}</p>
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={handleAdd}
        >
          {added ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Added
            </>
          ) : (
            "Add to Cart"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
