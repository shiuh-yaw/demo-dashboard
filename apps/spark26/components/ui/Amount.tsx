// Shared currency renderer — "$" is rendered at weight 500 in muted blue,
// the digits are the hero at weight 800 white. Matches the type identity
// established on the Amount-due hero and reused on the Review total.

type AmountProps = {
  value: string | number;
  size?: "lg" | "md";
  className?: string;
};

export function Amount({ value, size = "lg", className = "" }: AmountProps) {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  const digits = Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(value);
  const sizeClass = size === "lg" ? "display-amount" : "display-amount-sm";
  return (
    <span className={[sizeClass, className].join(" ")}>
      <span className="display-currency">$</span>
      <span>{digits}</span>
    </span>
  );
}
