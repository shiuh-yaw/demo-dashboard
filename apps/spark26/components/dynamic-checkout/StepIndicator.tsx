// Slim step-progress dots shown at the top of each checkout panel so users
// know where they are in the flow (Connect → Token → Review → Complete).
// `current` is 1-indexed; zero or negative hides the indicator.

const STEPS = ["Connect", "Token", "Review", "Complete"];

export function StepIndicator({ current }: { current: number }) {
  if (current <= 0) return null;
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEPS.length}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${STEPS.length}`}
      className="flex items-center gap-1.5"
    >
      {STEPS.map((_, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <span
            key={stepNum}
            className={[
              "h-1 rounded-full transition-all",
              isActive
                ? "w-8 bg-[var(--color-blue)]"
                : isDone
                  ? "w-4 bg-[color-mix(in_srgb,var(--color-blue)_55%,transparent)]"
                  : "w-4 bg-[var(--color-navy-line)]",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
