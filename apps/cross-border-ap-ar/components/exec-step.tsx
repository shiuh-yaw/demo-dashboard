import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecStepProps {
  state: "pending" | "active" | "done";
  num: number;
  label: string;
  sub: string;
  detail?: string;
}

export function ExecStep({ state, num, label, sub, detail }: ExecStepProps) {
  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg border transition-all duration-300",
        state === "pending" && "opacity-40 border-gray-200 bg-white",
        state === "active" && "border-blue-300 bg-blue-50",
        state === "done" && "border-green-200 bg-green-50",
      )}
    >
      <div className="shrink-0 mt-0.5">
        {state === "pending" && (
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500">
            {num}
          </div>
        )}
        {state === "active" && (
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center animate-spin">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}
        {state === "done" && (
          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            state === "active" && "text-blue-800",
            state === "done" && "text-green-800",
            state === "pending" && "text-gray-700",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "text-xs mt-0.5",
            state === "active" && "text-blue-600",
            state === "done" && "text-green-600",
            state === "pending" && "text-gray-500",
          )}
        >
          {sub}
        </p>
        {state === "done" && detail && (
          <p className="text-xs text-green-700 mt-1.5 font-mono break-all">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
