import { Shell } from "../ui/Shell.js";

export function CancelledOrderView({ attendeeName }: { attendeeName?: string }) {
  return (
    <Shell>
      <section className="card">
        <p className="label mb-3 text-[var(--color-pink-100)]">Cancelled</p>
        <h1 className="text-[32px] sm:text-[38px] mb-4">
          Registration cancelled.
        </h1>
        <p className="text-[15px] leading-[1.55] text-[color-mix(in_srgb,var(--color-blue-100)_82%,transparent)]">
          {attendeeName ? `${attendeeName}, this ` : "This "}
          registration has been cancelled in Cvent. If this is unexpected,
          contact{" "}
          <a
            className="font-semibold text-[var(--color-blue-100)] hover:text-white underline-offset-4 hover:underline"
            href="mailto:spark26@fireblocks.com"
          >
            spark26@fireblocks.com
          </a>
          .
        </p>
      </section>
    </Shell>
  );
}
