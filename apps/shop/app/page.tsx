import { products } from "@/data/products";
import { ProductCard } from "@/components/product-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { CartIcon } from "@/components/cart-icon";

export default function ShopPage() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-semibold">Crypto Shop</h1>
        <div className="flex items-center gap-2">
          <CartIcon />
          <ThemeToggle />
        </div>
      </header>
      <main className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  );
}
