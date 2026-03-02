import { TrendingUp } from "lucide-react";

interface EarnYieldOptionProps {
  apy: number;
}

export function EarnYieldOption({ apy }: EarnYieldOptionProps) {
  return (
    <div className="bg-white border border-earn-border/60 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors flex-1">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
        <TrendingUp className="w-5 h-5 text-earn-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-normal text-earn-text-primary mb-0.5">
          Earn yield
        </h3>
        <p className="text-xs text-earn-text-secondary">
          Keep funds in your balance and earn {apy}% APY
        </p>
      </div>
    </div>
  );
}
