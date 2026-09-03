"use client";

import { Card } from "@/components/primitives";

/** Draw it early and unprompted: the one picture that stops most APAC confusion. */
export function Boundary() {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-ink/20">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Fireblocks vault</div>
          <h3 className="text-lg font-bold mt-1">Rimau's own money</h3>
          <p className="text-[13px] text-muted mt-1">Treasury, corporate holdings, exchange hot and cold wallets, market-making capital.</p>
          <ul className="mt-4 text-[13px] space-y-1.5 list-disc pl-4 text-ink-2">
            <li>Institutional MPC custody with governance and policy engine</li>
            <li>Multi-approver workflows, transaction authorization policy</li>
            <li>Insurance, uptime and the track record institutions already trust</li>
            <li>Flow for on/off ramp, conversion and non-EVM rails such as Tron</li>
          </ul>
        </Card>
        <Card className="border-brand/40">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">Dynamic embedded wallets</div>
          <h3 className="text-lg font-bold mt-1">Three million end users' money</h3>
          <p className="text-[13px] text-muted mt-1">One wallet per user, inside the Rimau app, keys the user holds a share of.</p>
          <ul className="mt-4 text-[13px] space-y-1.5 list-disc pl-4 text-ink-2">
            <li>2-of-2 TSS-MPC: client share on device, server share in enclave</li>
            <li>Social login and passkey sign-in instead of a seed phrase</li>
            <li>Wallet connector for embedded and external wallets in one integration</li>
            <li>Gas sponsorship (Enterprise) and Earn (stablecoin, EVM)</li>
          </ul>
        </Card>
      </div>
      <div className="rounded-2xl bg-ink text-white px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold">One platform underneath both</div>
          <div className="text-[13px] text-white/70">Fireblocks core for the exchange's balance sheet. Dynamic for its users. The line is who the money belongs to.</div>
        </div>
        <div className="text-[12px] text-white/60">Draw this once, then point back at it whenever the conversation drifts.</div>
      </div>
    </div>
  );
}
