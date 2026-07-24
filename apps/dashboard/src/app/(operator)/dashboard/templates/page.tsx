/**
 * Templates (Phase GTM-07). The demo catalog as cards. "Create demo" links to
 * the existing per-kind config form; showcase entries without a kind link to
 * their live URL instead.
 */

import Link from "next/link";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/droplet-client";
import { LANDING_DEMOS } from "@/lib/landing/demos";
import type { DemoConfigKind } from "@/lib/services";

/**
 * Per-kind config-form route the "Create demo" button launches. Partial -
 * kinds with no dashboard editor (flow, managed entirely by apps/flow)
 * fall through to the demo's live-url button instead.
 */
const CREATE_ROUTE: Partial<Record<DemoConfigKind, string>> = {
  wallet: "/wallets/new",
  earn: "/earns/new",
  trade: "/trade/new",
  "visa-direct": "/visa-direct/new",
  checkout: "/checkouts/new",
  remittance: "/remittance/new",
};

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#0e121b]">Templates</h1>
        <p className="mt-1 text-sm text-[#525866]">
          Start from a demo type, brand it for a prospect, and share a link.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LANDING_DEMOS.map((demo) => {
          const createRoute = demo.kind ? CREATE_ROUTE[demo.kind] : undefined;
          return (
          <Card key={demo.slug} className="flex flex-col">
            <CardHeader>
              <CardTitle>{demo.name}</CardTitle>
              <CardDescription>{demo.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {demo.stack.slice(0, 4).map((chip) => (
                  <Badge key={chip} variant="secondary">
                    {chip}
                  </Badge>
                ))}
              </div>
              {createRoute ? (
                <Button asChild size="sm" className="w-full">
                  <Link href={createRoute}>Create demo</Link>
                </Button>
              ) : demo.url ? (
                <Button asChild size="sm" variant="secondary" className="w-full">
                  <a href={demo.url} target="_blank" rel="noreferrer">
                    View demo
                  </a>
                </Button>
              ) : (
                <Button size="sm" variant="secondary" className="w-full" disabled>
                  Coming soon
                </Button>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
