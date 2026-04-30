"use client";

const OPTIONS = [
  { label: "Add from bank account", desc: "On-ramp USD to USDC", icon: "🏦" },
  { label: "Receive from wallet", desc: "Share your address to receive USDC", icon: "↙️" },
  { label: "Deposit from exchange", desc: "Transfer from Coinbase, Kraken, etc.", icon: "🔄" },
];

export function AddFundsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-base font-semibold text-(--widget-fg)">
            Add USDC
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-(--widget-primary) hover:underline"
          >
            Cancel
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-2">
          <p className="text-sm text-(--widget-muted) mb-4">
            Choose how you'd like to add USDC to your stablecoin wallet.
          </p>

          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className="w-full flex items-center gap-3 text-left p-4 rounded-(--widget-radius) bg-(--widget-row-bg) hover:bg-(--widget-row-hover) transition-colors"
            >
              <span className="text-xl">{opt.icon}</span>
              <div>
                <div className="text-sm font-semibold text-(--widget-fg)">
                  {opt.label}
                </div>
                <div className="text-xs text-(--widget-muted) mt-0.5">
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
