import {
  LANDING_DEMOS,
  getDemoBySlug,
  PLAYGROUND_SLUG,
} from "@/lib/landing/demos";
import { DemoCard } from "./_components/demo-card";
import { PlaygroundBanner } from "./_components/playground-banner";

export default function LandingPage() {
  const playground = getDemoBySlug(PLAYGROUND_SLUG);
  return (
    <>
      {/* Hero */}
      <section>
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4779FF]">
            Dynamic Demos
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            See what you can build on Dynamic.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
            Live apps spanning embedded wallets, trading, yield, crypto
            payments, and global payouts - all built on the Dynamic SDK.
          </p>
        </div>
      </section>

      {/* Playground rides its own featured banner, not a product card. */}
      {playground && <PlaygroundBanner demo={playground} />}

      {/* Demo grid */}
      <section className="mx-auto max-w-6xl px-6 pt-4 pb-16">
        <h2 className="sr-only">Demos</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_DEMOS.filter(
            (demo) => demo.showOnLanding && demo.slug !== PLAYGROUND_SLUG,
          ).map((demo) => (
            <DemoCard key={demo.slug} demo={demo} />
          ))}
        </div>
      </section>
    </>
  );
}
