"use client";

/**
 * Category navigation for filtering prediction markets.
 */

const CATEGORY_LABELS: Record<string, string> = {
  tech: "Tech",
  sports: "Sports",
  crypto: "Crypto",
  weather: "Weather",
  finance: "Finance",
};

function getCategoryLabel(slug: string): string {
  try {
    const normalized = slug.toLowerCase().replace(/\s+/g, "-");
    return CATEGORY_LABELS[normalized] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  } catch {
    return slug;
  }
}

interface CategoryNavProps {
  categories: string[];
  active: string;
  onSelect: (category: string) => void;
}

export function CategoryNav({ categories, active, onSelect }: CategoryNavProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
      {categories.map((slug) => {
        const label = getCategoryLabel(slug);
        const isActive = active === slug;

        return (
          <button
            key={slug}
            type="button"
            onClick={() => onSelect(slug)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-trade-accent text-white"
                : "bg-trade-surface border border-trade-border text-trade-text-secondary hover:bg-trade-bg hover:text-trade-text-primary"
            }`}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
