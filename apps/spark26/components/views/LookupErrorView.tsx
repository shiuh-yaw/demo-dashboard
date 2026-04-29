import { Shell } from "../ui/Shell.js";
import { maskConfirmation } from "@/lib/format.js";

export function LookupErrorView({
  confirmation,
  reason,
}: {
  confirmation: string;
  reason?: string;
}) {
  return (
    <Shell>
      <section className="card">
        <p className="label mb-3 text-[var(--color-pink-100)]">
          Registration not found
        </p>
        <h1 className="text-[28px] sm:text-[34px] mb-4">
          We couldn't find your registration.
        </h1>
        <p className="text-[15px] leading-[1.55] text-[color-mix(in_srgb,var(--color-blue-100)_82%,transparent)]">
          The link for{" "}
          <code className="font-mono text-[13px] rounded-md px-1.5 py-0.5 bg-white/5 border border-white/10">
            {maskConfirmation(confirmation)}
          </code>{" "}
          {reason
            ? `couldn't be used (${reason}). `
            : "didn't match anything in our system. "}
          Check the URL in your Cvent confirmation email, or contact{" "}
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
