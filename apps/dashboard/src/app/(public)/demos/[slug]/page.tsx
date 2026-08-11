import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/droplet-client";
import {
  LANDING_DEMOS,
  getDemoBySlug,
  PLAYGROUND_SLUG,
  type LandingDemo,
} from "@/lib/landing/demos";
import { DemoHero } from "../../_components/demo-hero";
import { clearThemeUrl } from "@/lib/share-links/launch-url";

function LaunchCta({
  demo,
  className = "",
}: {
  demo: LandingDemo;
  className?: string;
}) {
  if (demo.url === undefined) {
    return (
      <Button disabled size="lg" className={className}>
        Launch demo
      </Button>
    );
  }
  return (
    <Button asChild size="lg">
      <a
        href={clearThemeUrl(demo.url)}
        target="_blank"
        rel="noreferrer"
        className={`group/cta ${className}`}
      >
        Launch demo
        <ArrowUpRight className="h-4 w-4 transition-transform duration-150 group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5" />
      </a>
    </Button>
  );
}

interface DemoPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  // Playground is banner-only (launches straight out), so it has no detail page.
  return LANDING_DEMOS.filter(
    (demo) => demo.showOnLanding && demo.slug !== PLAYGROUND_SLUG,
  ).map((demo) => ({
    slug: demo.slug,
  }));
}

export async function generateMetadata({
  params,
}: DemoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const demo = getDemoBySlug(slug);
  if (!demo || slug === PLAYGROUND_SLUG) return {};
  const title = `${demo.name} - Dynamic Demos`;
  return {
    title,
    description: demo.tagline,
    openGraph: {
      type: "website",
      siteName: "Dynamic Demos",
      title,
      description: demo.tagline,
      url: `/demos/${demo.slug}`,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: demo.tagline,
      images: ["/og.png"],
    },
  };
}

export default async function DemoDetailPage({ params }: DemoPageProps) {
  const { slug } = await params;
  const demo = getDemoBySlug(slug);
  // Playground is banner-only: it has no detail page.
  if (!demo || slug === PLAYGROUND_SLUG) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 pt-8 pb-16">
      {/* Chevron rather than an arrow, easing left on hover - same back
          affordance the demos themselves use. */}
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        All demos
      </Link>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E1E4EA] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <DemoHero demo={demo} className="h-56" illustrationClassName="scale-125" />
      </div>

      {demo.url === undefined && (
        <p className="mt-8 text-xs font-medium text-slate-400">Coming soon</p>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {demo.name}
        </h1>
        <div className="hidden shrink-0 sm:block">
          <LaunchCta demo={demo} />
        </div>
      </div>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        {demo.description}
      </p>

      <ul className="mt-8 space-y-3">
        {demo.highlights.map((highlight) => (
          <li key={highlight} className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4779FF]" />
            <span className="text-slate-700">{highlight}</span>
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          Under the hood
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {demo.stack.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#E1E4EA] bg-white px-3 py-1 text-sm text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
        {demo.resources.length > 0 && (
          <ul className="mt-5 space-y-2">
            {demo.resources.map((resource) => (
              <li key={resource.url}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#4779FF] transition-colors hover:text-[#3a66e0]"
                >
                  {resource.label}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {demo.url !== undefined && (
        <div
          className="sticky bottom-0 z-40 -mx-6 mt-10 border-t border-[#E7E9EE] bg-[#F4F5F7]/90 px-4 pt-3 backdrop-blur sm:hidden"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <LaunchCta demo={demo} className="w-full justify-center" />
        </div>
      )}
    </article>
  );
}
