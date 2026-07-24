/**
 * Documentation landing. Visible to every operator (not admin-gated); links to
 * the existing provider integration doc pages under /documentation/*.
 */

import Link from "next/link";
import { CreditCard, Landmark, ArrowDownToLine, Banknote } from "lucide-react";

import { Card } from "@/components/droplet-client";
import { requireUser } from "@/lib/auth/gtm";

export const dynamic = "force-dynamic";

const DOCS = [
  {
    href: "/documentation/checkouts",
    title: "Checkouts",
    description: "Payment widget for crypto deposits and purchases.",
    icon: CreditCard,
  },
  {
    href: "/documentation/iron",
    title: "Iron",
    description: "Stablecoin onramp and offramp with KYC.",
    icon: Landmark,
  },
  {
    href: "/documentation/onramp",
    title: "Coinbase Onramp",
    description: "Hosted fiat-to-crypto onramp flow.",
    icon: ArrowDownToLine,
  },
  {
    href: "/documentation/blindpay",
    title: "BlindPay",
    description: "Custodial stablecoin payouts and payins across LATAM/US/EU.",
    icon: Banknote,
  },
] as const;

export default async function DocumentationPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Documentation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Legacy provider integration guides. New documentation - how to build
          demos, integrate analytics tracking, and more - is coming soon.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOCS.map((doc) => (
          <Link key={doc.href} href={doc.href} className="block">
            <Card className="h-full transition-shadow hover:shadow-elevated">
              <div className="flex flex-col gap-1 p-5">
                <doc.icon className="h-5 w-5 text-action" />
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {doc.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {doc.description}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
