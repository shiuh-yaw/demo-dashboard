import { Shell } from "../ui/Shell.js";

export function EmptyInstructionsView() {
  return (
    <Shell>
      <section className="card">
        <p className="label mb-3">Registration</p>
        <h1 className="text-[32px] sm:text-[40px] mb-4">
          Pay your registration.
        </h1>
        <p className="text-[15px] leading-[1.5] text-[color-mix(in_srgb,var(--color-blue-100)_82%,transparent)]">
          Open the payment link in your Cvent confirmation email. If you don't
          have one, contact{" "}
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
