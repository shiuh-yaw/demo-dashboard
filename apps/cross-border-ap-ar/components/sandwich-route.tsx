import { truncateAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SandwichRouteProps {
  depositAddress?: string;
  sellerBank?: string;
  blockchain?: string;
  compact?: boolean;
}

interface NodeProps {
  color: string;
  label: string;
  sub: string;
  compact?: boolean;
}

function Node({ color, label, sub, compact }: NodeProps) {
  return (
    <div className={cn("flex flex-col items-center", compact ? "gap-0.5" : "gap-1")}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center text-white font-bold shrink-0",
          compact ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm",
          color,
        )}
      >
        {label.slice(0, 1)}
      </div>
      <p
        className={cn(
          "font-semibold text-gray-800 text-center leading-tight",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-gray-500 text-center leading-tight",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        {sub}
      </p>
    </div>
  );
}

interface ArrowProps {
  label: string;
  compact?: boolean;
}

function Arrow({ label, compact }: ArrowProps) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className="flex items-center w-full">
        <div className="flex-1 h-px bg-gray-300" />
        <div className="mx-1 text-gray-400 text-xs">›</div>
        <div className="flex-1 h-px bg-gray-300" />
      </div>
      <span
        className={cn(
          "text-gray-400 text-center whitespace-nowrap",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function SandwichRoute({
  depositAddress,
  sellerBank,
  blockchain = "Ethereum",
  compact,
}: SandwichRouteProps) {
  const depositSub = depositAddress
    ? truncateAddress(depositAddress)
    : "deposit address";

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto pb-1">
      <Node
        color="bg-blue-500"
        label="Etsy, Inc."
        sub="USD treasury"
        compact={compact}
      />
      <Arrow label="MTLco" compact={compact} />
      <Node
        color="bg-green-500"
        label="On-ramp"
        sub="USD → USDC"
        compact={compact}
      />
      <Arrow label={blockchain} compact={compact} />
      <Node
        color="bg-purple-500"
        label="alfredPay"
        sub={depositSub}
        compact={compact}
      />
      <Arrow label="SPEI" compact={compact} />
      <Node
        color="bg-amber-500"
        label={sellerBank ?? "Seller bank"}
        sub="beneficiary bank"
        compact={compact}
      />
    </div>
  );
}
